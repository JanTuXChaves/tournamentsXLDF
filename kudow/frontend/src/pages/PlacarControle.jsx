import { useState, useEffect, useRef, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, Trophy, ArrowLeft, ExternalLink, ShieldAlert, CheckCircle, Clock, MessageSquare, History, Trash2, Plus, Lock, Award, AlertTriangle, Zap } from 'lucide-react';
import api, { WS_BASE_URL } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const PlacarControle = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const partidaId = searchParams.get('partida_id');

    const [partida, setPartida] = useState(null);
    const [pontosAka, setPontosAka] = useState(0);
    const [pontosShiro, setPontosShiro] = useState(0);
    const [punicoesAka, setPunicoesAka] = useState(0);
    const [punicoesShiro, setPunicoesShiro] = useState(0);
    const [tempoRestante, setTempoRestante] = useState(180);
    const [cronometroAtivo, setCronometroAtivo] = useState(false);
    const [statusPartida, setStatusPartida] = useState('PRONTO');
    const [isGoldenScore, setIsGoldenScore] = useState(false);

    const [historicoAcoes, setHistoricoAcoes] = useState([]);
    const [observacoesArbitro, setObservacoesArbitro] = useState('');
    const [novoComentario, setNovoComentario] = useState('');

    const socketRef = useRef(null);
    const bcRef = useRef(null);

    const podePontuar = cronometroAtivo && (statusPartida === 'EM_ANDAMENTO' || statusPartida === 'GOLDEN_SCORE');
    const lutaFinalizada = statusPartida === 'FINALIZADA';

    useEffect(() => {
        if (!partidaId) return;

        const channelName = `kudow_placar_${partidaId}`;
        const bc = new BroadcastChannel(channelName);
        bcRef.current = bc;

        const carregarDadosIniciais = async () => {
            try {
                const resPartida = await api.get(`/eventos/partidas/${partidaId}`);
                setPartida(resPartida.data);
                if (resPartida.data.vencedor_id) {
                    setStatusPartida('FINALIZADA');
                }
                if (resPartida.data.observacoes_arbitro) {
                    setObservacoesArbitro(resPartida.data.observacoes_arbitro);
                }
                if (resPartida.data.historico_pontos) {
                    try {
                        const parsed = JSON.parse(resPartida.data.historico_pontos);
                        if (Array.isArray(parsed)) setHistoricoAcoes(parsed);
                    } catch {}
                }

                const resPlacar = await api.get(`/placar/partidas/${partidaId}/estado`);
                if (resPlacar.data) {
                    setPontosAka(resPlacar.data.pontos_atleta_1 || 0);
                    setPontosShiro(resPlacar.data.pontos_atleta_2 || 0);
                    setPunicoesAka(resPlacar.data.punicoes_atleta_1 || 0);
                    setPunicoesShiro(resPlacar.data.punicoes_atleta_2 || 0);
                    setTempoRestante(resPlacar.data.tempo_restante_segundos ?? 180);
                    if (resPlacar.data.status_partida) setStatusPartida(resPlacar.data.status_partida);
                    if (resPlacar.data.status_partida === 'GOLDEN_SCORE') setIsGoldenScore(true);
                    if (resPlacar.data.observacoes_arbitro) setObservacoesArbitro(resPlacar.data.observacoes_arbitro);
                }
            } catch {}
        };

        carregarDadosIniciais();

        const token = localStorage.getItem('kudow_token') || '';
        const wsUrl = `${WS_BASE_URL}/placar/ws/partidas/${partidaId}?token=${encodeURIComponent(token)}`;
        let ws;
        try {
            ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.pontos_atleta_1 !== undefined) setPontosAka(data.pontos_atleta_1);
                    if (data.pontos_atleta_2 !== undefined) setPontosShiro(data.pontos_atleta_2);
                    if (data.punicoes_atleta_1 !== undefined) setPunicoesAka(data.punicoes_atleta_1);
                    if (data.punicoes_atleta_2 !== undefined) setPunicoesShiro(data.punicoes_atleta_2);
                    if (data.tempo_restante_segundos !== undefined) setTempoRestante(data.tempo_restante_segundos);
                    if (data.status_partida) {
                        setStatusPartida(data.status_partida);
                        setIsGoldenScore(data.status_partida === 'GOLDEN_SCORE');
                    }
                    if (data.observacoes_arbitro !== undefined) setObservacoesArbitro(data.observacoes_arbitro);
                } catch {}
            };
        } catch {}

        return () => {
            if (ws) ws.close();
            if (bc) bc.close();
        };
    }, [partidaId]);

    const formatarTempo = (segundos) => {
        const m = Math.floor(Math.abs(segundos) / 60);
        const s = Math.abs(segundos) % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const transmitirEstado = (novoEstado, novoHistorico = null, novasObservacoes = null) => {
        const histFinal = novoHistorico ?? historicoAcoes;
        const obsFinal = novasObservacoes ?? observacoesArbitro;

        const payload = {
            partida_id: Number(partidaId),
            pontos_atleta_1: novoEstado.pontosAka !== undefined ? novoEstado.pontosAka : pontosAka,
            pontos_atleta_2: novoEstado.pontosShiro !== undefined ? novoEstado.pontosShiro : pontosShiro,
            punicoes_atleta_1: novoEstado.punicoesAka !== undefined ? novoEstado.punicoesAka : punicoesAka,
            punicoes_atleta_2: novoEstado.punicoesShiro !== undefined ? novoEstado.punicoesShiro : punicoesShiro,
            tempo_restante_segundos: novoEstado.tempo !== undefined ? novoEstado.tempo : tempoRestante,
            status_partida: novoEstado.status !== undefined ? novoEstado.status : statusPartida,
            observacoes_arbitro: obsFinal,
            historico_pontos: JSON.stringify(histFinal)
        };

        if (bcRef.current) {
            bcRef.current.postMessage(payload);
        }

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(payload));
        }

        api.put(`/placar/partidas/${partidaId}/placar`, payload).catch(() => {});
    };

    const registrarEventoHistorico = (canto, acao, detalhe, tempoAtual = tempoRestante) => {
        const novoItem = {
            id: Date.now(),
            tempo_formatado: (isGoldenScore ? 'GS ' : '') + formatarTempo(tempoAtual),
            canto,
            acao,
            detalhe,
            hora_real: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        const atualizado = [novoItem, ...historicoAcoes];
        setHistoricoAcoes(atualizado);
        return atualizado;
    };

    useEffect(() => {
        let interval = null;
        if (cronometroAtivo && statusPartida !== 'FINALIZADA') {
            if (!isGoldenScore && tempoRestante > 0) {
                interval = setInterval(() => {
                    setTempoRestante(prev => {
                        const novoTempo = prev - 1;
                        transmitirEstado({ tempo: novoTempo, status: 'EM_ANDAMENTO' });
                        return novoTempo;
                    });
                }, 1000);
            } else if (!isGoldenScore && tempoRestante === 0) {

                if (pontosAka === pontosShiro) {
                    setIsGoldenScore(true);
                    setStatusPartida('GOLDEN_SCORE');
                    setTempoRestante(0);
                    const h = registrarEventoHistorico('GERAL', 'GOLDEN SCORE', 'Tempo regulamentar empatado. Iniciado Golden Score (Morte Súbita)!', 0);
                    transmitirEstado({ tempo: 0, status: 'GOLDEN_SCORE' }, h);
                } else {
                    setCronometroAtivo(false);
                    setStatusPartida('TEMPO_ESGOTADO');
                    const vencedorNome = pontosAka > pontosShiro ? partida?.atleta_1_nome : partida?.atleta_2_nome;
                    const h = registrarEventoHistorico('GERAL', 'FIM DE TEMPO', `Tempo regulamentar esgotado. Vitória por pontos de ${vencedorNome}!`, 0);
                    transmitirEstado({ tempo: 0, status: 'TEMPO_ESGOTADO' }, h);
                }
            } else if (isGoldenScore) {

                interval = setInterval(() => {
                    setTempoRestante(prev => {
                        const novoTempo = prev + 1;
                        transmitirEstado({ tempo: novoTempo, status: 'GOLDEN_SCORE' });
                        return novoTempo;
                    });
                }, 1000);
            }
        }
        return () => clearInterval(interval);
    }, [cronometroAtivo, tempoRestante, statusPartida, isGoldenScore, pontosAka, pontosShiro]);

    const aplicarWazaAriAka = () => {
        if (!validarPodePontuar()) return;
        const novoValor = pontosAka + 1;
        setPontosAka(novoValor);

        if (novoValor >= 2) {

            const h = registrarEventoHistorico(
                'VERMELHO',
                'WAZA-ARI AWASETE IPPON',
                `🥋 2º Waza-ari! Waza-ari Awasete Ippon para ${partida?.atleta_1_nome || 'Canto Vermelho'}!`
            );
            transmitirEstado({ pontosAka: novoValor }, h);
            setTimeout(() => {
                if (window.confirm(`🏆 WAZA-ARI AWASETE IPPON! ${partida?.atleta_1_nome} atingiu 2 Waza-ari (Ippon). Confirmar vitória imediata?`)) {
                    declararVencedor(partida?.atleta_1_id, partida?.atleta_1_nome, 'Waza-ari Awasete Ippon');
                }
            }, 100);
        } else {
            const h = registrarEventoHistorico(
                'VERMELHO',
                'WAZA-ARI',
                `🥋 Waza-ari marcado por ${partida?.atleta_1_nome || 'Canto Vermelho'} (Total: ${novoValor} Waza-ari)`
            );
            transmitirEstado({ pontosAka: novoValor }, h);

            if (isGoldenScore) {
                setTimeout(() => {
                    if (window.confirm(`🏆 GOLDEN SCORE! ${partida?.atleta_1_nome} pontuou Waza-ari no Golden Score. Confirmar vitória?`)) {
                        declararVencedor(partida?.atleta_1_id, partida?.atleta_1_nome, 'Golden Score (Waza-ari)');
                    }
                }, 100);
            }
        }
    };

    const aplicarWazaAriShiro = () => {
        if (!validarPodePontuar()) return;
        const novoValor = pontosShiro + 1;
        setPontosShiro(novoValor);

        if (novoValor >= 2) {

            const h = registrarEventoHistorico(
                'BRANCO',
                'WAZA-ARI AWASETE IPPON',
                `🥋 2º Waza-ari! Waza-ari Awasete Ippon para ${partida?.atleta_2_nome || 'Canto Branco'}!`
            );
            transmitirEstado({ pontosShiro: novoValor }, h);
            setTimeout(() => {
                if (window.confirm(`🏆 WAZA-ARI AWASETE IPPON! ${partida?.atleta_2_nome} atingiu 2 Waza-ari (Ippon). Confirmar vitória imediata?`)) {
                    declararVencedor(partida?.atleta_2_id, partida?.atleta_2_nome, 'Waza-ari Awasete Ippon');
                }
            }, 100);
        } else {
            const h = registrarEventoHistorico(
                'BRANCO',
                'WAZA-ARI',
                `🥋 Waza-ari marcado por ${partida?.atleta_2_nome || 'Canto Branco'} (Total: ${novoValor} Waza-ari)`
            );
            transmitirEstado({ pontosShiro: novoValor }, h);

            if (isGoldenScore) {
                setTimeout(() => {
                    if (window.confirm(`🏆 GOLDEN SCORE! ${partida?.atleta_2_nome} pontuou Waza-ari no Golden Score. Confirmar vitória?`)) {
                        declararVencedor(partida?.atleta_2_id, partida?.atleta_2_nome, 'Golden Score (Waza-ari)');
                    }
                }, 100);
            }
        }
    };

    const aplicarIpponDireto = (canto, atletaId, nomeAtleta) => {
        if (!validarPodePontuar()) return;
        if (window.confirm(`🥋 IPPON! Confirmar vitória imediata por IPPON de ${nomeAtleta}?`)) {
            if (canto === 'VERMELHO') setPontosAka(10);
            else setPontosShiro(10);

            const h = registrarEventoHistorico(canto, 'IPPON (VITÓRIA)', `🏆 IPPON aplicado com perfeição por ${nomeAtleta}!`);
            transmitirEstado({ pontosAka: canto === 'VERMELHO' ? 10 : pontosAka, pontosShiro: canto === 'BRANCO' ? 10 : pontosShiro }, h);
            declararVencedor(atletaId, nomeAtleta, 'Ippon');
        }
    };

    const subtrairPontoAka = () => {
        if (!validarPodePontuar()) return;
        const val = Math.max(0, pontosAka - 1);
        setPontosAka(val);
        const h = registrarEventoHistorico('VERMELHO', 'CORREÇÃO', `-1 ponto corrigido de ${partida?.atleta_1_nome || 'Canto Vermelho'}`);
        transmitirEstado({ pontosAka: val }, h);
    };

    const subtrairPontoShiro = () => {
        if (!validarPodePontuar()) return;
        const val = Math.max(0, pontosShiro - 1);
        setPontosShiro(val);
        const h = registrarEventoHistorico('BRANCO', 'CORREÇÃO', `-1 ponto corrigido de ${partida?.atleta_2_nome || 'Canto Branco'}`);
        transmitirEstado({ pontosShiro: val }, h);
    };

    const alterarPunicoesAka = (delta) => {
        if (lutaFinalizada) {
            alert('⚠️ A luta já foi finalizada! Reabra a luta para aplicar faltas.');
            return;
        }
        const val = Math.max(0, Math.min(3, punicoesAka + delta));
        setPunicoesAka(val);

        if (val === 3 && delta > 0) {

            const h = registrarEventoHistorico(
                'VERMELHO',
                '🚨 HANSOKU-MAKE (3º SHIDO)',
                `3º Shido aplicado a ${partida?.atleta_1_nome}. Desclassificação por Hansoku-make!`
            );
            transmitirEstado({ punicoesAka: 3 }, h);

            setTimeout(() => {
                if (window.confirm(`🚨 3º SHIDO = HANSOKU-MAKE!\n\nO atleta ${partida?.atleta_1_nome} acumulou 3 advertências (Shido) e foi desclassificado.\n\nConfirmar vitória de ${partida?.atleta_2_nome} (Canto Branco) por Hansoku-make?`)) {
                    declararVencedor(partida?.atleta_2_id, partida?.atleta_2_nome, 'Hansoku-make do adversário');
                }
            }, 100);
        } else {
            const h = registrarEventoHistorico(
                'VERMELHO',
                delta > 0 ? 'SHIDO' : 'CANCELAR SHIDO',
                delta > 0 ? `Advertência Shido (${val}/3) aplicada a ${partida?.atleta_1_nome || 'Canto Vermelho'}` : `Shido cancelado para ${partida?.atleta_1_nome}`
            );
            transmitirEstado({ punicoesAka: val }, h);
        }
    };

    const alterarPunicoesShiro = (delta) => {
        if (lutaFinalizada) {
            alert('⚠️ A luta já foi finalizada! Reabra a luta para aplicar faltas.');
            return;
        }
        const val = Math.max(0, Math.min(3, punicoesShiro + delta));
        setPunicoesShiro(val);

        if (val === 3 && delta > 0) {

            const h = registrarEventoHistorico(
                'BRANCO',
                '🚨 HANSOKU-MAKE (3º SHIDO)',
                `3º Shido aplicado a ${partida?.atleta_2_nome}. Desclassificação por Hansoku-make!`
            );
            transmitirEstado({ punicoesShiro: 3 }, h);

            setTimeout(() => {
                if (window.confirm(`🚨 3º SHIDO = HANSOKU-MAKE!\n\nO atleta ${partida?.atleta_2_nome} acumulou 3 advertências (Shido) e foi desclassificado.\n\nConfirmar vitória de ${partida?.atleta_1_nome} (Canto Vermelho) por Hansoku-make?`)) {
                    declararVencedor(partida?.atleta_1_id, partida?.atleta_1_nome, 'Hansoku-make do adversário');
                }
            }, 100);
        } else {
            const h = registrarEventoHistorico(
                'BRANCO',
                delta > 0 ? 'SHIDO' : 'CANCELAR SHIDO',
                delta > 0 ? `Advertência Shido (${val}/3) aplicada a ${partida?.atleta_2_nome || 'Canto Branco'}` : `Shido cancelado para ${partida?.atleta_2_nome}`
            );
            transmitirEstado({ punicoesShiro: val }, h);
        }
    };

    const validarPodePontuar = () => {
        if (lutaFinalizada) {
            alert('⚠️ A luta já foi finalizada! Reabra a luta para alterar pontos.');
            return false;
        }
        if (!podePontuar) {
            alert('⚠️ O cronômetro precisa estar INICIADO (em andamento) para poder lançar pontos na luta!');
            return false;
        }
        return true;
    };

    const toggleCronometro = () => {
        if (lutaFinalizada) {
            alert('⚠️ Esta luta já foi finalizada! Clique em "Reabrir Luta" caso precise reiniciar.');
            return;
        }
        const novoAtivo = !cronometroAtivo;
        const novoStatus = novoAtivo ? (isGoldenScore ? 'GOLDEN_SCORE' : 'EM_ANDAMENTO') : 'PAUSADO';
        setCronometroAtivo(novoAtivo);
        setStatusPartida(novoStatus);
        const h = registrarEventoHistorico(
            'GERAL',
            novoAtivo ? 'INÍCIO/RETOMADA' : 'PAUSA TÉCNICA',
            novoAtivo ? 'Cronômetro iniciado pelo árbitro' : 'Luta pausada pela arbitragem'
        );
        transmitirEstado({ status: novoStatus }, h);
    };

    const resetarCronometro = (segundos = 180) => {
        if (lutaFinalizada) {
            alert('⚠️ Esta luta já foi finalizada! Clique em "Reabrir Luta" caso precise reiniciar.');
            return;
        }
        setCronometroAtivo(false);
        setIsGoldenScore(false);
        setTempoRestante(segundos);
        setStatusPartida('PRONTO');
        const h = registrarEventoHistorico('GERAL', 'RESET', `Cronômetro redefinido para ${formatarTempo(segundos)}`);
        transmitirEstado({ tempo: segundos, status: 'PRONTO' }, h);
    };

    const declararVencedor = async (vencedorId, nomeAtleta, motivo = 'Decisão Arbitral') => {
        try {
            const histFinal = [...historicoAcoes, {
                id: Date.now(),
                tempo_formatado: formatarTempo(tempoRestante),
                canto: 'GERAL',
                acao: `VITÓRIA (${motivo.toUpperCase()})`,
                detalhe: `🏆 ${nomeAtleta} declarado vencedor oficial por ${motivo}. Placar final: ${pontosAka}x${pontosShiro} pts (${punicoesAka}x${punicoesShiro} shidos).`,
                hora_real: new Date().toLocaleTimeString('pt-BR')
            }];

            await api.put(`/eventos/partidas/${partidaId}`, {
                vencedor_id: vencedorId,
                pontos_atleta_1: pontosAka,
                pontos_atleta_2: pontosShiro,
                punicoes_atleta_1: punicoesAka,
                punicoes_atleta_2: punicoesShiro,
                tipo_vitoria: motivo,
                observacoes: observacoesArbitro,
                historico_pontos: JSON.stringify(histFinal),
                sem_mesa_controle: false
            });

            setCronometroAtivo(false);
            setStatusPartida('FINALIZADA');
            setHistoricoAcoes(histFinal);
            const h = registrarEventoHistorico('GERAL', 'VITÓRIA OFICIAL', `🏆 ${nomeAtleta} declarado vencedor (${motivo})`);
            transmitirEstado({ status: 'FINALIZADA' }, h);
            alert(`🏆 Vitória confirmada para ${nomeAtleta} (${motivo})! O chaveamento e o histórico de lutas do atleta foram atualizados.`);
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao salvar o vencedor.");
        }
    };

    const reabrirLuta = async () => {
        if (window.confirm(`Reabrir esta luta? O status voltará para 'EM ABERTO' e o vencedor será cancelado no chaveamento.`)) {
            try {
                await api.put(`/eventos/partidas/${partidaId}?vencedor_id=0`);
                setStatusPartida('PRONTO');
                setCronometroAtivo(false);
                setIsGoldenScore(false);
                const h = registrarEventoHistorico('GERAL', 'REABERTURA', 'Luta reaberta pela arbitragem. Status retornado para EM ABERTO.');
                transmitirEstado({ status: 'PRONTO' }, h);
                alert('Luta reaberta com sucesso! Status retornado para Em Aberto.');
            } catch (error) {
                alert(error.response?.data?.detail || "Erro ao reabrir luta.");
            }
        }
    };

    const salvarObservacao = () => {
        if (!novoComentario.trim()) return;
        const textoCompleto = observacoesArbitro
            ? `${observacoesArbitro}\n[${formatarTempo(tempoRestante)}] ${novoComentario.trim()}`
            : `[${formatarTempo(tempoRestante)}] ${novoComentario.trim()}`;

        setObservacoesArbitro(textoCompleto);
        const h = registrarEventoHistorico('SÚMULA', 'OBSERVAÇÃO DO ÁRBITRO', novoComentario.trim());
        setNovoComentario('');
        transmitirEstado({}, h, textoCompleto);
    };

    const limparHistorico = () => {
        if (window.confirm("Limpar todo o histórico de pontos desta luta?")) {
            setHistoricoAcoes([]);
            transmitirEstado({}, []);
        }
    };

    const semPermissao = !user || user.tipo_usuario === 'ATLETA' || (
        user.tipo_usuario === 'ENTIDADE' &&
        partida &&
        partida.evento_entidade_responsavel_id !== user.entidade_id
    );

    if (semPermissao) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div className="card glass-panel" style={{ maxWidth: '520px', textAlign: 'center', padding: '2.5rem' }}>
                    <Lock size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
                    <h2 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>Acesso Restrito à Mesa de Controle</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                        Apenas a <strong>Entidade Organizadora</strong> responsável por este torneio, <strong>Árbitros Oficiais</strong> ou a administração <strong>Master</strong> possuem permissão para operar o placar eletrônico desta luta.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                            Voltar ao Torneio
                        </button>
                        <button className="btn btn-primary" onClick={() => navigate(`/placar?partida_id=${partidaId}`)}>
                            📺 Ir para o Telão Público (Modo Espectador)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            padding: '1.5rem',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate(-1)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                    >
                        <ArrowLeft size={16} /> Voltar ao Torneio
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldAlert size={20} color="var(--brand-primary)" /> Mesa Oficial de Judô & Arbitragem
                        </h2>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {partida?.evento_nome} • {partida?.categoria_nome} • Luta #{partida?.numero_luta || partidaId}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {statusPartida === 'FINALIZADA' && (
                        <button
                            className="btn btn-secondary"
                            onClick={reabrirLuta}
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: '#ef4444', fontWeight: 600 }}
                        >
                            🔄 Reabrir Luta (Voltar para Em Aberto)
                        </button>
                    )}
                    <button
                        className="btn btn-secondary"
                        onClick={async () => {
                            try {
                                const res = await api.get(`/eventos/partidas/${partidaId}/sumula-pdf?t=${Date.now()}`, { responseType: 'blob' });
                                const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', `Sumula_Luta_${partidaId}.pdf`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            } catch {
                                alert('Erro ao gerar Súmula em PDF.');
                            }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                    >
                        📄 Baixar Súmula PDF
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => window.open(`/placar?partida_id=${partidaId}`, '_blank')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
                    >
                        <ExternalLink size={16} /> 🖥️ Abrir Telão do Público
                    </button>
                </div>
            </div>

            {isGoldenScore && (
                <div style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    border: '2px solid #f59e0b',
                    color: '#f59e0b',
                    fontWeight: 800,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)'
                }}>
                    <Zap size={22} />
                    🥋 GOLDEN SCORE (Morte Súbita Ativa): O primeiro ponto ou punição (Shido) define a vitória imediatamente!
                </div>
            )}

            {!podePontuar && !isGoldenScore && (
                <div style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    backgroundColor: lutaFinalizada ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    border: `1px solid ${lutaFinalizada ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    color: lutaFinalizada ? '#ef4444' : '#f59e0b',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    marginBottom: '1.5rem'
                }}>
                    <Lock size={18} />
                    {lutaFinalizada
                        ? 'Luta Encerrada: A pontuação está bloqueada. Clique em "Reabrir Luta" caso deseje fazer alterações.'
                        : 'Pontuação Pausada: Inicie o cronômetro oficial no painel central para habilitar o lançamento de Waza-ari e Ippon.'}
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 340px 1fr',
                gap: '1.5rem',
                alignItems: 'start',
                marginBottom: '2rem'
            }}>

                <div className="card glass-panel" style={{ border: '2px solid #ef4444', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ backgroundColor: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            CANTO VERMELHO (AKA)
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            UF: {partida?.atleta_1_estado || 'SP'}
                        </span>
                    </div>

                    <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem 0' }}>
                        {partida?.atleta_1_nome || 'Atleta Canto Vermelho'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        {partida?.atleta_1_entidade || 'Federação Kudow'}
                    </p>

                    <div style={{ textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '4.5rem', fontWeight: '900', color: '#ef4444', lineHeight: 1 }}>
                            {pontosAka >= 10 ? 'IPPON' : `${pontosAka} W`}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {pontosAka === 1 ? '1 WAZA-ARI' : (pontosAka >= 2 ? 'WAZA-ARI AWASETE IPPON' : 'PONTUAÇÃO')}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.5rem' }}>
                            <button
                                className="btn btn-primary"
                                disabled={!podePontuar}
                                style={{
                                    backgroundColor: podePontuar ? '#ef4444' : 'rgba(239, 68, 68, 0.2)',
                                    borderColor: podePontuar ? '#ef4444' : 'rgba(239, 68, 68, 0.3)',
                                    opacity: podePontuar ? 1 : 0.45,
                                    cursor: podePontuar ? 'pointer' : 'not-allowed',
                                    padding: '0.85rem',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem'
                                }}
                                onClick={aplicarWazaAriAka}
                                title={!podePontuar ? "Inicie o cronômetro para pontuar" : "Computar 1 Waza-ari (2 W = Ippon)"}
                            >
                                <Award size={18} /> +1 Waza-ari
                            </button>
                            <button
                                className="btn btn-secondary"
                                disabled={!podePontuar}
                                style={{
                                    opacity: podePontuar ? 1 : 0.45,
                                    cursor: podePontuar ? 'pointer' : 'not-allowed',
                                    padding: '0.85rem',
                                    fontSize: '0.9rem'
                                }}
                                onClick={subtrairPontoAka}
                            >
                                -1 Waza-ari
                            </button>
                        </div>

                        <button
                            className="btn btn-primary"
                            disabled={!podePontuar}
                            style={{
                                backgroundColor: podePontuar ? '#b91c1c' : 'rgba(185, 28, 28, 0.2)',
                                borderColor: podePontuar ? '#b91c1c' : 'rgba(185, 28, 28, 0.3)',
                                opacity: podePontuar ? 1 : 0.45,
                                padding: '0.75rem',
                                fontWeight: '800',
                                fontSize: '0.95rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem'
                            }}
                            onClick={() => aplicarIpponDireto('VERMELHO', partida?.atleta_1_id, partida?.atleta_1_nome)}
                        >
                            🥋 Ippon Direto (Vitória Imediata)
                        </button>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                Shido: {punicoesAka}/3 {punicoesAka === 3 ? '(Hansoku-make!)' : ''}
                            </span>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                {[1, 2, 3].map(num => {
                                    const isActive = punicoesAka >= num;
                                    return (
                                        <div
                                            key={num}
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                backgroundColor: isActive ? (num === 3 ? '#ef4444' : '#f59e0b') : 'rgba(255,255,255,0.1)',
                                                border: `2px solid ${isActive ? (num === 3 ? '#ef4444' : '#f59e0b') : 'rgba(255,255,255,0.2)'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                color: isActive ? '#000' : '#64748b'
                                            }}
                                        >
                                            S{num}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button
                                className="btn btn-secondary"
                                disabled={lutaFinalizada}
                                style={{ padding: '0.5rem', fontSize: '0.8rem', opacity: lutaFinalizada ? 0.4 : 1, color: '#f59e0b' }}
                                onClick={() => alterarPunicoesAka(1)}
                            >
                                +1 Shido (Falta)
                            </button>
                            <button
                                className="btn btn-secondary"
                                disabled={lutaFinalizada}
                                style={{ padding: '0.5rem', fontSize: '0.8rem', opacity: lutaFinalizada ? 0.4 : 1 }}
                                onClick={() => alterarPunicoesAka(-1)}
                            >
                                -1 Shido
                            </button>
                        </div>
                    </div>

                    {partida?.atleta_1_id && (
                        <button
                            className="btn btn-primary"
                            disabled={lutaFinalizada}
                            style={{
                                width: '100%',
                                backgroundColor: '#ef4444',
                                borderColor: '#ef4444',
                                padding: '0.9rem',
                                fontWeight: 'bold',
                                fontSize: '0.95rem',
                                opacity: lutaFinalizada ? 0.5 : 1
                            }}
                            onClick={() => declararVencedor(partida.atleta_1_id, partida.atleta_1_nome, 'Decisão Arbitral')}
                        >
                            🏆 Declarar Vitória (Canto Vermelho)
                        </button>
                    )}
                </div>

                <div className="card glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        CRONÔMETRO OFICIAL DE JUDÔ
                    </h4>

                    <div style={{
                        fontSize: '3.8rem',
                        fontWeight: '900',
                        fontFamily: 'monospace',
                        color: isGoldenScore ? '#f59e0b' : (tempoRestante <= 30 ? '#ef4444' : 'var(--text-primary)'),
                        marginBottom: '1rem',
                        textShadow: isGoldenScore ? '0 0 25px rgba(245, 158, 11, 0.6)' : 'none'
                    }}>
                        {formatarTempo(tempoRestante)}
                    </div>

                    <div style={{
                        display: 'inline-block',
                        padding: '4px 14px',
                        borderRadius: '20px',
                        backgroundColor: isGoldenScore ? 'rgba(245, 158, 11, 0.2)' : (cronometroAtivo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                        color: isGoldenScore ? '#f59e0b' : (cronometroAtivo ? '#10b981' : '#f59e0b'),
                        fontWeight: 'bold',
                        fontSize: '0.8rem',
                        marginBottom: '1.5rem'
                    }}>
                        ● {isGoldenScore ? '🥋 GOLDEN SCORE (MORTE SÚBITA)' : (statusPartida === 'PRONTO' ? 'EM ABERTO' : statusPartida)}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button
                            className="btn btn-primary"
                            onClick={toggleCronometro}
                            disabled={lutaFinalizada}
                            style={{
                                padding: '1rem',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                backgroundColor: cronometroAtivo ? '#f59e0b' : 'var(--brand-primary)',
                                opacity: lutaFinalizada ? 0.4 : 1
                            }}
                        >
                            {cronometroAtivo ? <Pause size={20} /> : <Play size={20} />}
                            {cronometroAtivo ? 'Pausar Tempo' : 'Iniciar Combate'}
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button
                                className="btn btn-secondary"
                                disabled={lutaFinalizada}
                                onClick={() => resetarCronometro(180)}
                                style={{ padding: '0.6rem', fontSize: '0.85rem', opacity: lutaFinalizada ? 0.4 : 1 }}
                            >
                                <RotateCcw size={14} /> 3 Min (Oficial)
                            </button>
                            <button
                                className="btn btn-secondary"
                                disabled={lutaFinalizada}
                                onClick={() => resetarCronometro(240)}
                                style={{ padding: '0.6rem', fontSize: '0.85rem', opacity: lutaFinalizada ? 0.4 : 1 }}
                            >
                                <RotateCcw size={14} /> 4 Min (Sênior)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="card glass-panel" style={{ border: '2px solid #f8fafc', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ backgroundColor: '#ffffff', color: '#000', padding: '4px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            CANTO BRANCO (SHIRO)
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            UF: {partida?.atleta_2_estado || 'SP'}
                        </span>
                    </div>

                    <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem 0' }}>
                        {partida?.atleta_2_nome || 'Atleta Canto Branco'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        {partida?.atleta_2_entidade || 'Federação Kudow'}
                    </p>

                    <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '4.5rem', fontWeight: '900', color: '#ffffff', lineHeight: 1 }}>
                            {pontosShiro >= 10 ? 'IPPON' : `${pontosShiro} W`}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {pontosShiro === 1 ? '1 WAZA-ARI' : (pontosShiro >= 2 ? 'WAZA-ARI AWASETE IPPON' : 'PONTUAÇÃO')}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.5rem' }}>
                            <button
                                className="btn btn-secondary"
                                disabled={!podePontuar}
                                style={{
                                    backgroundColor: podePontuar ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                                    color: podePontuar ? '#000' : 'var(--text-muted)',
                                    opacity: podePontuar ? 1 : 0.45,
                                    cursor: podePontuar ? 'pointer' : 'not-allowed',
                                    padding: '0.85rem',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem'
                                }}
                                onClick={aplicarWazaAriShiro}
                                title={!podePontuar ? "Inicie o cronômetro para pontuar" : "Computar 1 Waza-ari (2 W = Ippon)"}
                            >
                                <Award size={18} /> +1 Waza-ari
                            </button>
                            <button
                                className="btn btn-secondary"
                                disabled={!podePontuar}
                                style={{
                                    opacity: podePontuar ? 1 : 0.45,
                                    cursor: podePontuar ? 'pointer' : 'not-allowed',
                                    padding: '0.85rem',
                                    fontSize: '0.9rem'
                                }}
                                onClick={subtrairPontoShiro}
                            >
                                -1 Waza-ari
                            </button>
                        </div>

                        <button
                            className="btn btn-secondary"
                            disabled={!podePontuar}
                            style={{
                                backgroundColor: podePontuar ? '#f1f5f9' : 'rgba(241, 245, 249, 0.2)',
                                color: '#000',
                                opacity: podePontuar ? 1 : 0.45,
                                padding: '0.75rem',
                                fontWeight: '800',
                                fontSize: '0.95rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem'
                            }}
                            onClick={() => aplicarIpponDireto('BRANCO', partida?.atleta_2_id, partida?.atleta_2_nome)}
                        >
                            🥋 Ippon Direto (Vitória Imediata)
                        </button>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                Shido: {punicoesShiro}/3 {punicoesShiro === 3 ? '(Hansoku-make!)' : ''}
                            </span>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                {[1, 2, 3].map(num => {
                                    const isActive = punicoesShiro >= num;
                                    return (
                                        <div
                                            key={num}
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                backgroundColor: isActive ? (num === 3 ? '#ef4444' : '#f59e0b') : 'rgba(255,255,255,0.1)',
                                                border: `2px solid ${isActive ? (num === 3 ? '#ef4444' : '#f59e0b') : 'rgba(255,255,255,0.2)'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                color: isActive ? '#000' : '#64748b'
                                            }}
                                        >
                                            S{num}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button
                                className="btn btn-secondary"
                                disabled={lutaFinalizada}
                                style={{ padding: '0.5rem', fontSize: '0.8rem', opacity: lutaFinalizada ? 0.4 : 1, color: '#f59e0b' }}
                                onClick={() => alterarPunicoesShiro(1)}
                            >
                                +1 Shido (Falta)
                            </button>
                            <button
                                className="btn btn-secondary"
                                disabled={lutaFinalizada}
                                style={{ padding: '0.5rem', fontSize: '0.8rem', opacity: lutaFinalizada ? 0.4 : 1 }}
                                onClick={() => alterarPunicoesShiro(-1)}
                            >
                                -1 Shido
                            </button>
                        </div>
                    </div>

                    {partida?.atleta_2_id && (
                        <button
                            className="btn btn-primary"
                            disabled={lutaFinalizada}
                            style={{
                                width: '100%',
                                backgroundColor: '#ffffff',
                                color: '#000',
                                borderColor: '#ffffff',
                                padding: '0.9rem',
                                fontWeight: 'bold',
                                fontSize: '0.95rem',
                                opacity: lutaFinalizada ? 0.5 : 1
                            }}
                            onClick={() => declararVencedor(partida.atleta_2_id, partida.atleta_2_nome, 'Decisão Arbitral')}
                        >
                            🏆 Declarar Vitória (Canto Branco)
                        </button>
                    )}
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '1.5rem',
                alignItems: 'start'
            }}>

                <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <History size={18} color="var(--brand-primary)" /> Linha do Tempo de Judô & Histórico por Minutagem
                        </h3>
                        {historicoAcoes.length > 0 && (
                            <button
                                type="button"
                                onClick={limparHistorico}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                                <Trash2 size={14} /> Limpar
                            </button>
                        )}
                    </div>

                    {historicoAcoes.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <Clock size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <p style={{ margin: 0 }}>Nenhum ponto ou falta lançado ainda.</p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem' }}>Cada Waza-ari, Ippon ou Shido será registrado automaticamente com a minutagem do relógio.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {historicoAcoes.map((item) => {
                                const isRed = item.canto === 'VERMELHO';
                                const isWhite = item.canto === 'BRANCO';
                                return (
                                    <div
                                        key={item.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.6rem 0.9rem',
                                            borderRadius: '8px',
                                            backgroundColor: isRed ? 'rgba(239, 68, 68, 0.08)' : (isWhite ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)'),
                                            borderLeft: `4px solid ${isRed ? '#ef4444' : (isWhite ? '#f8fafc' : 'var(--brand-primary)')}`
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--brand-primary)', fontSize: '0.9rem', minWidth: '55px' }}>
                                                ⏱️ {item.tempo_formatado}
                                            </span>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {item.acao}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {item.detalhe}
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {item.hora_real}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MessageSquare size={18} color="var(--brand-primary)" /> Súmula & Parecer Oficial do Árbitro
                        </h3>
                    </div>

                    {observacoesArbitro && (
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '0.85rem',
                            marginBottom: '1rem',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '160px',
                            overflowY: 'auto'
                        }}>
                            {observacoesArbitro}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <textarea
                            value={novoComentario}
                            onChange={(e) => setNovoComentario(e.target.value)}
                            placeholder="Adicione observações da luta (ex: atendimento médico, advertência verbal, decisão arbitral)..."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                resize: 'none',
                                fontSize: '0.85rem'
                            }}
                        />
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={salvarObservacao}
                            disabled={!novoComentario.trim()}
                            style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                        >
                            <Plus size={16} /> Gravar Observação na Súmula
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlacarControle;
