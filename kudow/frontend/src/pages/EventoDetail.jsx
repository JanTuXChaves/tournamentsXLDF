import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, Download, Activity, PlayCircle, Lock, CheckCircle, PlusCircle, X, Edit, DollarSign, Printer, CreditCard, ShieldCheck } from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import CheckoutModal from '../components/CheckoutModal';

const EventoDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const isAtleta = user?.tipo_usuario === 'ATLETA';

    const [evento, setEvento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [gerandoChaves, setGerandoChaves] = useState(false);
    const [checkoutData, setCheckoutData] = useState(null);

    const canEdit = user && (user.tipo_usuario === 'MASTER' || (user.tipo_usuario === 'ENTIDADE' && evento?.entidade_responsavel_id === user.entidade_id));
    const canOperatePlacar = canEdit || user?.tipo_usuario === 'ARBITRO';

    const [inscricaoStatus, setInscricaoStatus] = useState({ inscrito: false });
    const [categorias, setCategorias] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
    const [inscrevendo, setInscrevendo] = useState(false);

    const [categoriasComInscricoes, setCategoriasComInscricoes] = useState([]);
    const [categoriaSelecionadaId, setCategoriaSelecionadaId] = useState('');
    const [partidas, setPartidas] = useState([]);
    const [loadingPartidas, setLoadingPartidas] = useState(false);

    const [modoVisualizacao, setModoVisualizacao] = useState('operacional');
    const [inscricoesEvento, setInscricoesEvento] = useState([]);
    const [pesosInput, setPesosInput] = useState({});
    const [novaCatInput, setNovaCatInput] = useState({});
    const [importandoCsv, setImportandoCsv] = useState(false);
    const [buscaAtleta, setBuscaAtleta] = useState('');
    const [zoomLevel, setZoomLevel] = useState(1);
    const [winnerModal, setWinnerModal] = useState({
        open: false,
        match: null,
        athleteId: null,
        athleteNome: '',
        position: 1,
        pontos1: 0,
        pontos2: 0,
        punicoes1: 0,
        punicoes2: 0,
        tipoVitoria: 'Ippon Direto (10 pts)',
        observacoes: '',
        salvando: false
    });

    const handleOpenWinnerModal = (match, athleteId, athleteNome, position) => {
        if (!athleteId || !canEdit) return;
        setWinnerModal({
            open: true,
            match,
            athleteId,
            athleteNome,
            position,
            pontos1: position === 1 ? 10 : 0,
            pontos2: position === 2 ? 10 : 0,
            punicoes1: 0,
            punicoes2: 0,
            tipoVitoria: 'Ippon Direto (10 pts)',
            observacoes: '',
            salvando: false
        });
    };

    const handleConfirmWinner = async () => {
        if (!winnerModal.match || !winnerModal.athleteId) return;
        try {
            setWinnerModal(prev => ({ ...prev, salvando: true }));
            await api.put(`/eventos/partidas/${winnerModal.match.codpartida}`, {
                vencedor_id: winnerModal.athleteId,
                pontos_atleta_1: Number(winnerModal.pontos1),
                pontos_atleta_2: Number(winnerModal.pontos2),
                punicoes_atleta_1: Number(winnerModal.punicoes1),
                punicoes_atleta_2: Number(winnerModal.punicoes2),
                tipo_vitoria: winnerModal.tipoVitoria,
                observacoes: winnerModal.observacoes,
                sem_mesa_controle: true
            });
            await carregarPartidas(categoriaSelecionadaId);
            setWinnerModal({ open: false, match: null, athleteId: null, athleteNome: '', position: 1, salvando: false });
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao registrar o resultado da luta.");
            setWinnerModal(prev => ({ ...prev, salvando: false }));
        }
    };

    const handleResetWinner = async (match) => {
        if (!canEdit) return;
        if (window.confirm(`Deseja reabrir a Luta #${match.numero_luta || match.codpartida} e resetar o vencedor?`)) {
            try {

                await api.put(`/eventos/partidas/${match.codpartida}?vencedor_id=0`);
                await carregarPartidas(categoriaSelecionadaId);
            } catch (error) {
                await carregarPartidas(categoriaSelecionadaId);
            }
        }
    };

    const carregarPartidas = async (catId) => {
        if (!catId) {
            setPartidas([]);
            return;
        }
        setLoadingPartidas(true);
        try {
            const res = await api.get(`/eventos/${id}/partidas`, {
                params: { categoria_id: catId }
            });
            setPartidas(res.data);
        } catch (err) {
            console.error("Erro ao carregar partidas da categoria", err);
            setPartidas([]);
        } finally {
            setLoadingPartidas(false);
        }
    };

    const carregarCategorias = async () => {
        try {
            const res = await api.get(`/eventos/${id}/categorias`);
            const cats = res.data || [];
            setCategoriasComInscricoes(cats);
            return cats;
        } catch {
            setCategoriasComInscricoes([]);
            return [];
        }
    };

    const carregarInscricoesEvento = async () => {
        try {
            const res = await api.get(`/eventos/${id}/inscricoes`);
            const lista = res.data || [];
            setInscricoesEvento(lista);
            const mapPesos = {};
            const mapCats = {};
            lista.forEach(item => {
                mapPesos[item.inscricao_id] = item.peso !== null && item.peso !== undefined ? item.peso : '';
                mapCats[item.inscricao_id] = item.categoria_id;
            });
            setPesosInput(mapPesos);
            setNovaCatInput(mapCats);
        } catch {
            setInscricoesEvento([]);
        }
    };

    const carregarDados = async () => {
        try {
            const reqs = [
                api.get(`/eventos/${id}`),
                api.get(`/eventos/${id}/categorias`).catch(() => ({ data: [] })),
                api.get(`/categorias/`).catch(() => ({ data: [] })),
                api.get(`/eventos/${id}/inscricoes`).catch(() => ({ data: [] }))
            ];
            if (isAtleta) {
                reqs.push(api.get(`/eventos/${id}/minha_inscricao`).catch(() => ({ data: { inscrito: false } })));
                reqs.push(api.get(`/eventos/${id}/categorias-elegiveis`).catch(() => ({ data: null })));
            }

            const respostas = await Promise.all(reqs);
            setEvento(respostas[0].data);

            const catsComInsc = respostas[1].data;
            setCategoriasComInscricoes(catsComInsc);
            const todasCats = respostas[2].data || [];
            const elegiveisData = isAtleta && respostas[5] ? respostas[5].data : null;
            if (elegiveisData && Array.isArray(elegiveisData.categorias_elegiveis) && elegiveisData.categorias_elegiveis.length > 0) {
                setCategorias(elegiveisData.categorias_elegiveis);
                if (elegiveisData.categoria_natural_id && !categoriaSelecionada) {
                    setCategoriaSelecionada(String(elegiveisData.categoria_natural_id));
                }
            } else {
                setCategorias(todasCats);
            }

            const listaInsc = respostas[3].data || [];
            setInscricoesEvento(listaInsc);
            const mapPesos = {};
            const mapCats = {};
            listaInsc.forEach(item => {
                mapPesos[item.inscricao_id] = item.peso !== null && item.peso !== undefined ? item.peso : '';
                mapCats[item.inscricao_id] = item.categoria_id;
            });
            setPesosInput(mapPesos);
            setNovaCatInput(mapCats);

            if (isAtleta && respostas[4]) {
                setInscricaoStatus(respostas[4].data);
            }

            if (catsComInsc.length > 0) {
                setCategoriaSelecionadaId(catsComInsc[0].codcat);
                await carregarPartidas(catsComInsc[0].codcat);
            }

            setLoading(false);
        } catch (error) {
            console.error("Erro ao carregar detalhes do evento", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [id, isAtleta]);

    const gerarChaves = async () => {
        setGerandoChaves(true);
        try {
            await api.post(`/eventos/${id}/gerar_chaves`);
            alert("Chaves geradas com sucesso para todas as categorias e regras de desempate!");

            const cats = await carregarCategorias();
            if (cats.length > 0) {
                let nextCatId = categoriaSelecionadaId;
                if (!nextCatId || !cats.some(c => c.codcat === Number(nextCatId))) {
                    nextCatId = cats[0].codcat;
                }
                setCategoriaSelecionadaId(nextCatId);
                await carregarPartidas(nextCatId);
            } else {
                setCategoriaSelecionadaId('');
                setPartidas([]);
            }
        } catch {
            alert("Erro ao gerar as chaves técnicas. Tente novamente.");
        } finally {
            setGerandoChaves(false);
        }
    };

    const baixarPdf = async () => {
        try {
            const res = await api.get(`/eventos/${id}/pdf?t=${Date.now()}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Chaves_Evento_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            if (error.response && error.response.data instanceof Blob) {
                try {
                    const text = await error.response.data.text();
                    const parsed = JSON.parse(text);
                    alert(parsed.detail || "Erro ao gerar o PDF das chaves.");
                    return;
                } catch (e) {}
            }
            alert(error.response?.data?.detail || "Nenhuma partida ou atleta confirmado encontrado para gerar o PDF.");
        }
    };

    const baixarSumulaPdf = async (partidaId) => {
        try {
            const res = await api.get(`/eventos/partidas/${partidaId}/sumula-pdf?t=${Date.now()}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Sumula_Luta_${partidaId}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            alert("Erro ao gerar PDF da Súmula Oficial.");
        }
    };

    const handleRegistrarPesagem = async (insc, acao = 'VALIDAR') => {
        const pesoVal = parseFloat(pesosInput[insc.inscricao_id]);
        if (isNaN(pesoVal) || pesoVal <= 0) {
            alert("Informe um peso válido em kg para aferir a pesagem.");
            return;
        }
        try {
            const payload = {
                peso_aferido: pesoVal,
                acao,
                nova_categoria_id: acao === 'REENQUADRAR' ? Number(novaCatInput[insc.inscricao_id]) : null
            };
            const res = await api.put(`/eventos/${id}/inscricoes/${insc.inscricao_id}/pesagem`, payload);
            alert(`${res.data.mensagem} (Status: ${res.data.status})`);
            await carregarInscricoesEvento();
            await carregarCategorias();
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao registrar pesagem oficial.");
        }
    };

    const handleUploadCsv = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportandoCsv(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post(`/eventos/${id}/importar-csv`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(`${res.data.mensagem}\nProcessados: ${res.data.total_processados} | Inscritos: ${res.data.inscritos_no_torneio}`);
            await carregarDados();
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao importar planilha CSV.");
        } finally {
            setImportandoCsv(false);
            e.target.value = '';
        }
    };

    const handleCategoriaChange = async (catId) => {
        setCategoriaSelecionadaId(catId);
        await carregarPartidas(catId);
    };

    const handleInscrever = async () => {
        if (!categoriaSelecionada) {
            alert('Selecione uma categoria para se inscrever.');
            return;
        }

        setInscrevendo(true);
        try {
            const res = await api.post(`/eventos/${id}/inscrever`, {
                atleta_id: user.atleta_id,
                categoria_id: categoriaSelecionada
            });
            setShowModal(false);
            const novaInscId = res.data?.codinsc;
            setInscricaoStatus({
                inscrito: true,
                status: 'CONFIRMADA',
                inscricao_id: novaInscId,
                pagamento_status: 'PENDENTE'
            });

            const cats = await carregarCategorias();
            if (cats.length > 0 && !categoriaSelecionadaId) {
                setCategoriaSelecionadaId(cats[0].codcat);
                await carregarPartidas(cats[0].codcat);
            }

            if (novaInscId) {
                setCheckoutData({
                    tipo: 'INSCRICAO_TORNEIO',
                    itemId: novaInscId,
                    titulo: `Taxa de Inscrição: ${evento.evento}`,
                    valor: evento.valor_inscricao || 80.00
                });
            } else {
                alert('Inscrição realizada com sucesso!');
            }
        } catch (error) {
            alert(error.response?.data?.detail || 'Erro ao realizar inscrição.');
        } finally {
            setInscrevendo(false);
        }
    };

    const verificarJanelaInscricao = () => {
        if (!evento.data_inicio_inscricao || !evento.data_fim_inscricao) return false;
        const hoje = new Date().toISOString().split('T')[0];
        return hoje >= evento.data_inicio_inscricao && hoje <= evento.data_fim_inscricao;
    };

    const buildTree = (matchesList) => {
        if (!matchesList || matchesList.length === 0) return null;

        const root = matchesList.find(m => m.proxima_partida_id === null || m.proxima_partida_id === undefined);
        if (!root) return null;

        const childrenMap = {};
        matchesList.forEach(m => {
            if (m.proxima_partida_id) {
                if (!childrenMap[m.proxima_partida_id]) {
                    childrenMap[m.proxima_partida_id] = [];
                }
                childrenMap[m.proxima_partida_id].push(m);
            }
        });

        Object.keys(childrenMap).forEach(parentId => {
            childrenMap[parentId].sort((a, b) => a.codpartida - b.codpartida);
        });

        const buildNode = (match) => {
            const children = childrenMap[match.codpartida] || [];
            return {
                match,
                left: children[0] ? buildNode(children[0]) : null,
                right: children[1] ? buildNode(children[1]) : null
            };
        };

        return buildNode(root);
    };

    const getRoundsFromPartidas = (partidasList) => {
        if (!partidasList || partidasList.length === 0) return [];

        const groups = {};
        partidasList.forEach(m => {
            const faseName = m.fase || 'Partida';
            if (!groups[faseName]) groups[faseName] = [];
            groups[faseName].push(m);
        });

        const sortedFases = Object.keys(groups).sort((a, b) => {
            if (a === 'Final') return 1;
            if (b === 'Final') return -1;
            if (a === 'Disputa de 3º Lugar') return 1;
            if (b === 'Disputa de 3º Lugar') return -1;
            return groups[b].length - groups[a].length;
        });

        let currentMatchNum = 1;
        return sortedFases.map(fase => {
            const matchesInRound = groups[fase].sort((a, b) => (a.proxima_partida_id || 0) - (b.proxima_partida_id || 0) || a.codpartida - b.codpartida);
            const matchesWithNum = matchesInRound.map(m => ({
                ...m,
                numero_luta: currentMatchNum++
            }));
            return {
                fase,
                matches: matchesWithNum
            };
        });
    };

    const formatAthleteInfo = (nome, sexo, peso) => {
        if (!nome) return '';
        let details = [];
        if (sexo) details.push(sexo);
        if (peso) details.push(`${peso}kg`);
        return details.length > 0 ? `${nome} (${details.join(' - ')})` : nome;
    };

    const renderAthleteSlot = (match, position) => {
        const athleteId = position === 1 ? match.atleta_1_id : match.atleta_2_id;
        const athleteNome = position === 1 ? match.atleta_1_nome : match.atleta_2_nome;
        const athleteSexo = position === 1 ? match.atleta_1_sexo : match.atleta_2_sexo;
        const athletePeso = position === 1 ? match.atleta_1_peso : match.atleta_2_peso;
        const oppositeAthleteId = position === 1 ? match.atleta_2_id : match.atleta_1_id;

        const isWinner = match.vencedor_id && match.vencedor_id === athleteId;
        const isLoser = match.vencedor_id && match.vencedor_id !== athleteId;

        const isClickable = canEdit && athleteId && !isWinner && (match.atleta_1_id && match.atleta_2_id);

        let statusText = null;
        if (position === 2 && !athleteId && match.atleta_1_id) {
            statusText = <span className="bracket-athlete-status bracket-status-bye">BYE</span>;
        } else if (isWinner) {
            statusText = <span className="bracket-athlete-status bracket-status-winner">VENCEU</span>;
        }

        const handleSelectWinner = () => {
            if (!isClickable) return;
            handleOpenWinnerModal(match, athleteId, athleteNome, position);
        };

        const getAthleteDisplay = () => {
            if (athleteNome) {
                return formatAthleteInfo(athleteNome, athleteSexo, athletePeso);
            }
            if (position === 2 && match.atleta_1_id && !athleteId) {
                return "Bye (Sem Oponente)";
            }
            return "Aguardando Adversário";
        };

        const getAthletePrintName = () => {
            if (athleteNome) {
                return athleteNome;
            }
            if (position === 2 && match.atleta_1_id && !athleteId) {
                return "Bye";
            }
            return "Aguardando";
        };

        return (
            <button
                type="button"
                className={`bracket-athlete-slot ${isClickable ? 'clickable' : ''} ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}`}
                onClick={handleSelectWinner}
                disabled={!isClickable}
            >
                <span className="bracket-athlete-name" title={getAthleteDisplay()}>
                    <span className="screen-only-info">{getAthleteDisplay()}</span>
                    <span className="print-only-info">{getAthletePrintName()}</span>
                </span>
                {statusText}
            </button>
        );
    };

    const renderTreeNode = (node) => {
        if (!node) return null;

        const { match, left, right } = node;
        const isLeaf = !left && !right;

        return (
            <div className={`bracket-node ${isLeaf ? 'bracket-leaf' : ''}`} key={match.codpartida}>
                <div className="bracket-card-wrapper">
                    <div className="bracket-match-card">
                        <div className="bracket-match-header">
                            <span>{match.fase || 'Partida'}</span>
                            <span>#{match.codpartida}</span>
                        </div>
                        <div className="bracket-match-body">
                            {renderAthleteSlot(match, 1)}
                            {renderAthleteSlot(match, 2)}
                        </div>
                    </div>
                </div>

                {!isLeaf && (
                    <div className="bracket-children">
                        <div className="bracket-child-wrapper">
                            {renderTreeNode(left)}
                        </div>
                        <div className="bracket-child-wrapper">
                            {renderTreeNode(right)}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Procurando Torneio...</div>;
    if (!evento) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--status-danger)' }}>Torneio não Encontrado</div>;

    const janelaAberta = verificarJanelaInscricao();

    return (
        <div className="evento-detail-page">
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/eventos')}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', marginBottom: '1rem', background: 'transparent', border: '1px solid var(--border-color)' }}
                    >
                        <ArrowLeft size={16} /> Voltar para Torneios
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '0.5rem', backgroundColor: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trophy size={32} color="white" />
                        </div>
                        <div>
                            <h1 style={{ color: 'var(--text-primary)', fontSize: '2rem', margin: '0 0 0.25rem 0' }}>{evento.evento}</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>ID #{evento.codevent} • Local: {evento.local || 'Não definido'} • Edição Padrão</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    {isAtleta ? (
                        inscricaoStatus.inscrito ? (
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <button className="btn btn-secondary" disabled style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'default', opacity: 0.8 }}>
                                    <CheckCircle size={18} color="var(--status-success)" /> Inscrito Confirmado
                                </button>
                                {inscricaoStatus.inscricao_id && inscricaoStatus.pagamento_status !== 'PAGO' && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setCheckoutData({
                                            tipo: 'INSCRICAO_TORNEIO',
                                            itemId: inscricaoStatus.inscricao_id,
                                            titulo: `Taxa de Inscrição: ${evento.evento}`,
                                            valor: evento.valor_inscricao || 80.00
                                        })}
                                        style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 700 }}
                                    >
                                        <CreditCard size={18} /> Pagar Taxa
                                    </button>
                                )}
                            </div>
                        ) : janelaAberta ? (
                            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <PlusCircle size={18} /> Quero me Inscrever
                            </button>
                        ) : (
                            <button className="btn btn-secondary" disabled style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'not-allowed' }}>
                                <Lock size={18} /> Inscrições Fechadas
                            </button>
                        )
                    ) : (
                        <>
                            {canEdit && (
                                <button className="btn btn-secondary" onClick={() => navigate(`/eventos/${id}/editar`)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <Edit size={18} /> Editar Torneio
                                </button>
                            )}
                            <button className="btn btn-secondary" onClick={baixarPdf} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <Download size={18} /> Chaves PDF
                            </button>
                            {canEdit && (
                                <button className="btn btn-primary" onClick={gerarChaves} disabled={gerandoChaves} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {gerandoChaves ? <Lock size={18} /> : <PlayCircle size={18} />}
                                    {gerandoChaves ? 'Sorteando...' : 'Zerar e Gerar Chaves'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

                <div className="card glass-panel">
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={18} /> Janela de Execução
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Início:</span>
                            <span style={{ fontWeight: 500 }}>{evento.data_inicio}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Fim Oficial:</span>
                            <span style={{ fontWeight: 500 }}>{evento.data_fim || 'Não divulgado'}</span>
                        </div>
                    </div>
                </div>

                <div className="card glass-panel">
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={18} /> Janela de Inscrições
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Abertura:</span>
                            <span style={{ fontWeight: 500 }}>{evento.data_inicio_inscricao || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Encerramento:</span>
                            <span style={{ fontWeight: 500, color: 'var(--status-danger)' }}>{evento.data_fim_inscricao || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div className="card glass-panel" style={{ borderLeft: '4px solid #10b981' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                        <CreditCard size={18} /> Taxa de Inscrição
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Valor por Categoria:</span>
                            <span style={{ fontWeight: 900, color: '#10b981', fontSize: '1.2rem' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(evento.valor_inscricao || 80.00)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Métodos:</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PIX, Cartão e Boleto</span>
                        </div>
                    </div>
                </div>

                <div className="card glass-panel">
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={18} /> Premiação
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Valor em Dinheiro:</span>
                            <span style={{ fontWeight: 600, color: evento.premiacao_dinheiro ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                                {evento.premiacao_dinheiro
                                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(evento.premiacao_dinheiro)
                                    : 'Não definida'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Tipo:</span>
                            <span style={{ fontWeight: 500 }}>{evento.premiacao_dinheiro ? 'Dinheiro' : 'Medalha / Troféu'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card glass-panel" style={{ padding: '1.5rem', overflow: 'hidden', marginBottom: '2rem' }}>
                <div className="card-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Trophy size={20} color="var(--brand-primary)" /> Chaveamento do Torneio
                            </h3>
                            {partidas.length > 0 && (
                                <div className="mgmt-view-toggle">
                                    <button
                                        type="button"
                                        className={`mgmt-tab-btn ${modoVisualizacao === 'operacional' ? 'active' : ''}`}
                                        onClick={() => setModoVisualizacao('operacional')}
                                    >
                                        <Activity size={16} /> Modo Operacional
                                    </button>
                                    <button
                                        type="button"
                                        className={`mgmt-tab-btn ${modoVisualizacao === 'arvore' ? 'active' : ''}`}
                                        onClick={() => setModoVisualizacao('arvore')}
                                    >
                                        <Trophy size={16} /> Árvore Visual
                                    </button>
                                </div>
                            )}
                        </div>

                        {categoriasComInscricoes.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Categoria:</label>
                                <select
                                    value={categoriaSelecionadaId}
                                    onChange={(e) => handleCategoriaChange(Number(e.target.value))}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        marginRight: '0.5rem'
                                    }}
                                >
                                    {categoriasComInscricoes.map(cat => (
                                        <option key={cat.codcat} value={cat.codcat}>
                                            {cat.nome_categoria || cat.descricao} ({cat.sexo})
                                        </option>
                                    ))}
                                </select>
                                {partidas.length > 0 && (
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => window.print()}
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', height: '38px', borderRadius: '0.5rem' }}
                                    >
                                        <Printer size={16} /> Imprimir Chaves
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {loadingPartidas ? (
                    <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Carregando chaves...
                    </div>
                ) : categoriasComInscricoes.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Trophy size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '500' }}>Nenhuma categoria com inscrições confirmadas.</p>
                        <p style={{ fontSize: '0.9rem' }}>Atletas precisam estar confirmados para que o chaveamento seja gerado.</p>
                    </div>
                ) : partidas.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <PlayCircle size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '500' }}>Chaves não geradas para esta categoria.</p>
                        {canEdit ? (
                            <p style={{ fontSize: '0.9rem' }}>Clique em <strong>"Zerar e Gerar Chaves"</strong> no topo da página para criar o chaveamento.</p>
                        ) : (
                            <p style={{ fontSize: '0.9rem' }}>Aguardando o organizador sortear e publicar as chaves.</p>
                        )}
                    </div>
                ) : (
                    <div>
                        {canEdit && (
                            <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle size={16} color="var(--brand-primary)" />
                                    <span><strong>Modo Gestão Ativo:</strong> Declare os vencedores das lutas ou abra o placar eletrônico do tatame para operar o combate.</span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    <span>Total: <strong>{partidas.length} lutas</strong></span>
                                    <span>Concluídas: <strong style={{ color: 'var(--brand-primary)' }}>{partidas.filter(p => p.vencedor_id).length}</strong></span>
                                    <span>Pendentes: <strong style={{ color: '#f59e0b' }}>{partidas.filter(p => !p.vencedor_id).length}</strong></span>
                                </div>
                            </div>
                        )}

                        {modoVisualizacao === 'operacional' && (
                            <div className="operational-panel">
                                {getRoundsFromPartidas(partidas).map((round, rIdx) => (
                                    <div key={rIdx} className="phase-block">
                                        <div className="phase-block-header">
                                            <div className="phase-block-title">
                                                <Trophy size={18} color="var(--brand-primary)" />
                                                {round.fase}
                                                <span className="phase-badge-count">{round.matches.length} Lutas</span>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {round.matches.filter(m => m.vencedor_id).length} de {round.matches.length} finalizadas
                                            </span>
                                        </div>

                                        <div className="operational-matches-grid">
                                            {round.matches.map((m) => {
                                                const isWinner1 = m.vencedor_id && m.vencedor_id === m.atleta_1_id;
                                                const isWinner2 = m.vencedor_id && m.vencedor_id === m.atleta_2_id;
                                                const isBye = m.atleta_1_id && !m.atleta_2_id && m.vencedor_id === m.atleta_1_id;
                                                const canDeclare = canEdit && m.atleta_1_id && m.atleta_2_id;

                                                return (
                                                    <div key={m.codpartida} className={`op-match-card ${m.vencedor_id ? 'concluida' : ''}`}>
                                                        <div className="op-match-header">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span>Luta #{m.numero_luta || m.codpartida}</span>
                                                                {m.observacoes_arbitro && m.observacoes_arbitro.includes('SEM USO DA MESA DE CONTROLE') && (
                                                                    <span title={m.observacoes_arbitro} style={{ fontSize: '0.7rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)', cursor: 'help' }}>
                                                                        ⚠️ Manual
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={`op-status-tag ${m.vencedor_id ? 'concluida' : 'pendente'}`}>
                                                                {m.vencedor_id ? '✓ Concluída' : '⚡ Em Aberto'}
                                                            </span>
                                                        </div>

                                                        <div className={`op-fighter-row ${isWinner1 ? 'is-winner' : ''}`}>
                                                            <div className="op-fighter-info">
                                                                <div className="op-fighter-corner-indicator corner-red" title="Canto Vermelho (Aka)" />
                                                                <span className="op-fighter-name" title={m.atleta_1_nome || 'Aguardando'}>
                                                                    {m.atleta_1_nome || (m.atleta_2_id ? 'Aguardando Luta Anterior' : 'Bye')}
                                                                </span>
                                                            </div>
                                                            {canDeclare && !m.vencedor_id && (
                                                                <button
                                                                    type="button"
                                                                    className="op-btn-declare-winner"
                                                                    onClick={() => handleOpenWinnerModal(m, m.atleta_1_id, m.atleta_1_nome, 1)}
                                                                >
                                                                    Venceu
                                                                </button>
                                                            )}
                                                            {isWinner1 && (
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                                                                    🏆 Vencedor
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className={`op-fighter-row ${isWinner2 ? 'is-winner' : ''}`}>
                                                            <div className="op-fighter-info">
                                                                <div className="op-fighter-corner-indicator corner-white" title="Canto Branco (Shiro)" />
                                                                <span className="op-fighter-name" title={m.atleta_2_nome || 'Aguardando'}>
                                                                    {m.atleta_2_nome || (m.atleta_1_id ? 'Aguardando Luta Anterior' : 'Bye')}
                                                                </span>
                                                            </div>
                                                            {canDeclare && !m.vencedor_id && (
                                                                <button
                                                                    type="button"
                                                                    className="op-btn-declare-winner"
                                                                    onClick={() => handleOpenWinnerModal(m, m.atleta_2_id, m.atleta_2_nome, 2)}
                                                                >
                                                                    Venceu
                                                                </button>
                                                            )}
                                                            {isWinner2 && (
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                                                                    🏆 Vencedor
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="op-match-footer" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                                                            {m.vencedor_id && canEdit && !isBye && (
                                                                <button
                                                                    type="button"
                                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', marginRight: 'auto' }}
                                                                    onClick={() => handleResetWinner(m)}
                                                                >
                                                                    Reabrir Luta
                                                                </button>
                                                            )}
                                                            {(m.vencedor_id || m.observacoes_arbitro) && !isBye && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-secondary"
                                                                    style={{ padding: '3px 8px', fontSize: '0.75rem', borderRadius: '4px', height: '26px' }}
                                                                    onClick={() => baixarSumulaPdf(m.codpartida)}
                                                                    title="Baixar Súmula Oficial da Luta em PDF"
                                                                >
                                                                    📄 Súmula PDF
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary"
                                                                style={{ padding: '3px 8px', fontSize: '0.75rem', borderRadius: '4px', height: '26px' }}
                                                                onClick={() => window.open(`/placar?partida_id=${m.codpartida}`, '_blank')}
                                                                title="Abrir Telão / TV com Placar Digital para Público e Atletas"
                                                            >
                                                                📺 Telão do Tatame
                                                            </button>
                                                            {canOperatePlacar && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary"
                                                                    style={{ padding: '3px 8px', fontSize: '0.75rem', borderRadius: '4px', height: '26px' }}
                                                                    onClick={() => window.open(`/placar/controle?partida_id=${m.codpartida}`, '_blank')}
                                                                    title="Abrir Mesa de Controle do Árbitro / Mesário"
                                                                >
                                                                    🎛️ Mesa de Controle
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {modoVisualizacao === 'arvore' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Zoom:</span>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                                        onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.15))}
                                    >
                                        -
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                                        onClick={() => setZoomLevel(1)}
                                    >
                                        {Math.round(zoomLevel * 100)}%
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                                        onClick={() => setZoomLevel(prev => Math.min(1.6, prev + 0.15))}
                                    >
                                        +
                                    </button>
                                </div>

                                <div className="tree-scroll-container">
                                    <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', transition: 'transform 0.15s ease-out' }}>
                                        <div className="tree-horizontal-bracket">
                                            {getRoundsFromPartidas(partidas).map((round, rIdx, allRounds) => {
                                                const isLast = rIdx === allRounds.length - 1;
                                                return (
                                                    <div key={rIdx} className="tree-column">
                                                        <div className="tree-column-header">
                                                            {round.fase} ({round.matches.length} Lutas)
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1, gap: '1.25rem' }}>
                                                            {round.matches.map((m) => {
                                                                return (
                                                                    <div key={m.codpartida} className={`tree-match-unit ${isLast ? 'final-round' : ''}`}>
                                                                        <div className="bracket-match-card">
                                                                            <div className="bracket-match-header">
                                                                                <span>{m.fase || 'Partida'}</span>
                                                                                <span>Luta #{m.numero_luta || m.codpartida}</span>
                                                                            </div>
                                                                            <div className="bracket-match-body">
                                                                                {renderAthleteSlot(m, 1)}
                                                                                {renderAthleteSlot(m, 2)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="print-bracket-section">
                            <div className="print-only-header">
                                <h1>{evento.evento}</h1>
                                <h2>
                                    Chaves Oficial de Competição — {
                                        categoriasComInscricoes.find(c => c.codcat === categoriaSelecionadaId)?.nome_categoria ||
                                        categoriasComInscricoes.find(c => c.codcat === categoriaSelecionadaId)?.descricao ||
                                        'Categoria'
                                    }
                                </h2>
                            </div>

                            <div className="print-only-grid">
                                {getRoundsFromPartidas(partidas).map((round, rIdx) => (
                                    <div key={rIdx} className="print-round-col">
                                        <div className="print-round-title">{round.fase}</div>
                                        <div className="print-round-matches">
                                            {round.matches.map((m) => {
                                                const isWinner1 = m.vencedor_id && m.vencedor_id === m.atleta_1_id;
                                                const isWinner2 = m.vencedor_id && m.vencedor_id === m.atleta_2_id;
                                                return (
                                                    <div key={m.codpartida} className="print-card-box">
                                                        <div className="print-card-header">Luta #{m.numero_luta || m.codpartida}</div>
                                                        <div className={`print-card-slot ${isWinner1 ? 'winner' : ''}`}>
                                                            {m.atleta_1_nome || (m.atleta_2_id ? '' : 'Bye')}
                                                        </div>
                                                        <div className={`print-card-slot ${isWinner2 ? 'winner' : ''}`}>
                                                            {m.atleta_2_nome || (m.atleta_1_id ? '' : 'Bye')}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {partidas.length > 0 && (() => {
                const lutaFinal = partidas.find(p => p.fase === 'Final');
                const lutaTerceiro = partidas.find(p => p.fase === 'Disputa de 3º Lugar');
                const ouroNome = lutaFinal?.vencedor_nome || null;
                const prataNome = lutaFinal?.vencedor_id
                    ? (lutaFinal.vencedor_id === lutaFinal.atleta_1_id ? lutaFinal.atleta_2_nome : lutaFinal.atleta_1_nome)
                    : null;
                const bronzeNome = lutaTerceiro?.vencedor_nome || null;

                return (
                    <div className="card glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #f59e0b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                    <Trophy size={20} color="#f59e0b" /> Pódio Oficial da Categoria
                                </h3>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Classificação atualizada automaticamente conforme o encerramento da Final e da Disputa de 3º Lugar.
                                </p>
                            </div>
                            <a
                                href={`${API_BASE_URL}/eventos/${id}/podio-pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                                <Download size={15} /> Relatório de Pódio (PDF)
                            </a>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.35rem' }}>🥇 1º LUGAR (OURO)</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{ouroNome || 'Aguardando Final'}</div>
                            </div>
                            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'rgba(148, 163, 184, 0.1)', border: '1px solid rgba(148, 163, 184, 0.3)' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>🥈 2º LUGAR (PRATA)</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{prataNome || 'Aguardando Final'}</div>
                            </div>
                            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706', marginBottom: '0.35rem' }}>🥉 3º LUGAR (BRONZE)</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{bronzeNome || 'Aguardando Disputa de 3º'}</div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <div className="card glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                            <Users size={20} color="var(--brand-primary)" /> Atletas Inscritos & Pesagem Oficial ({inscricoesEvento.length})
                        </h3>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Conferência de peso na balança oficial, status de pagamento da inscrição e re-enquadramento de categoria antes do chaveamento.
                        </p>
                    </div>

                    {canEdit && (
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <a
                                href={`${API_BASE_URL}/eventos/${id}/modelo-csv`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                                <Download size={15} /> Modelo CSV
                            </a>
                            <label className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                                <PlusCircle size={15} /> {importandoCsv ? 'Importando...' : 'Importar Atletas CSV'}
                                <input type="file" accept=".csv" onChange={handleUploadCsv} style={{ display: 'none' }} disabled={importandoCsv} />
                            </label>
                        </div>
                    )}
                </div>

                {inscricoesEvento.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Nenhum atleta inscrito neste torneio até o momento.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '0.75rem' }}>Atleta</th>
                                    <th style={{ padding: '0.75rem' }}>Academia / UF</th>
                                    <th style={{ padding: '0.75rem' }}>Categoria Atual</th>
                                    <th style={{ padding: '0.75rem' }}>Taxa</th>
                                    <th style={{ padding: '0.75rem' }}>Peso Aferido (kg)</th>
                                    <th style={{ padding: '0.75rem' }}>Status Pesagem</th>
                                    {canEdit && <th style={{ padding: '0.75rem', textAlign: 'right' }}>Ações de Pesagem / Categoria</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {inscricoesEvento.map((insc) => (
                                    <tr key={insc.inscricao_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {insc.atleta_nome}
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                                Faixa: {insc.faixa || 'Geral'} • {insc.sexo}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {insc.entidade_nome} ({insc.estado})
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{insc.categoria_nome}</span>
                                            {insc.peso_maximo && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    Limite: até {insc.peso_maximo} kg
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '10px',
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                backgroundColor: insc.pagamento_status === 'PAGO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                color: insc.pagamento_status === 'PAGO' ? '#10b981' : '#f59e0b'
                                            }}>
                                                {insc.pagamento_status || 'PENDENTE'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            {canEdit ? (
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={pesosInput[insc.inscricao_id] ?? ''}
                                                    onChange={(e) => setPesosInput(prev => ({ ...prev, [insc.inscricao_id]: e.target.value }))}
                                                    placeholder="Ex: 78.5"
                                                    style={{ width: '85px', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700 }}
                                                />
                                            ) : (
                                                <strong>{insc.peso ? `${insc.peso} kg` : '--'}</strong>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '10px',
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                backgroundColor: insc.status === 'CONFIRMADA' && insc.dentro_do_peso !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: insc.status === 'CONFIRMADA' && insc.dentro_do_peso !== false ? '#10b981' : '#ef4444'
                                            }}>
                                                {insc.status === 'CONFIRMADA' && insc.dentro_do_peso === false ? 'ACIMA DO PESO' : insc.status}
                                            </span>
                                        </td>
                                        {canEdit && (
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        onClick={() => handleRegistrarPesagem(insc, 'VALIDAR')}
                                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                                                    >
                                                        ⚖️ Aferir Peso
                                                    </button>
                                                    <select
                                                        value={novaCatInput[insc.inscricao_id] || insc.categoria_id}
                                                        onChange={(e) => setNovaCatInput(prev => ({ ...prev, [insc.inscricao_id]: e.target.value }))}
                                                        style={{ padding: '0.3rem', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.75rem', maxWidth: '140px' }}
                                                    >
                                                        {categorias.map(c => (
                                                            <option key={c.codcat} value={c.codcat}>
                                                                {c.nome_categoria || c.descricao}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() => handleRegistrarPesagem(insc, 'REENQUADRAR')}
                                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                                                    >
                                                        Mover Cat.
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="card glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Inscrição no Evento</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Selecione a sua categoria natural de peso ou, se desejar, escolha uma <strong>categoria ACIMA</strong> da sua faixa de peso atual.
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Escolha a Categoria</label>
                            <select
                                value={categoriaSelecionada}
                                onChange={(e) => setCategoriaSelecionada(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                    backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)', outline: 'none'
                                }}
                            >
                                <option value="">-- Selecione --</option>
                                {categorias.map(cat => (
                                    <option key={cat.codcat} value={cat.codcat}>
                                        {cat.tipo_elegibilidade === 'NATURAL' ? '⭐ [Sua Categoria] ' : (cat.tipo_elegibilidade === 'ACIMA' ? '⬆️ [Categoria Acima] ' : '')}
                                        {cat.nome_categoria || cat.descricao} ({cat.sexo}) - {cat.peso_maximo ? `Até ${cat.peso_maximo}kg` : 'Absoluto'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleInscrever} disabled={inscrevendo || !categoriaSelecionada}>
                                {inscrevendo ? 'Enviando...' : 'Confirmar Inscrição'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {winnerModal.open && (
                <div className="winner-modal-overlay" onClick={() => setWinnerModal({ open: false, match: null, athleteId: null, athleteNome: '', position: 1, salvando: false })}>
                    <div className="winner-modal-card" style={{ maxWidth: '640px', width: '100%', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                    <Trophy size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                                        Lançamento Manual de Resultado
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Luta #{winnerModal.match?.numero_luta || winnerModal.match?.codpartida} • {winnerModal.match?.fase || 'Confronto'}
                                    </p>
                                </div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                ⚠️ Sem Mesa de Controle
                            </span>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Selecione o Atleta Vencedor:
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                                <button
                                    type="button"
                                    onClick={() => setWinnerModal(prev => ({
                                        ...prev,
                                        athleteId: prev.match?.atleta_1_id,
                                        athleteNome: prev.match?.atleta_1_nome,
                                        position: 1,
                                        pontos1: prev.pontos1 === 0 ? 10 : prev.pontos1
                                    }))}
                                    style={{
                                        padding: '0.85rem',
                                        borderRadius: '10px',
                                        border: `2px solid ${winnerModal.athleteId === winnerModal.match?.atleta_1_id ? '#ef4444' : 'var(--border-color)'}`,
                                        backgroundColor: winnerModal.athleteId === winnerModal.match?.atleta_1_id ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.3rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>
                                        <div className="op-fighter-corner-indicator corner-red" />
                                        CANTO VERMELHO (AKA)
                                    </div>
                                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                        {winnerModal.match?.atleta_1_nome || 'Atleta 1'}
                                    </span>
                                    {winnerModal.athleteId === winnerModal.match?.atleta_1_id && (
                                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
                                            🏆 Selecionado como Vencedor
                                        </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setWinnerModal(prev => ({
                                        ...prev,
                                        athleteId: prev.match?.atleta_2_id,
                                        athleteNome: prev.match?.atleta_2_nome,
                                        position: 2,
                                        pontos2: prev.pontos2 === 0 ? 10 : prev.pontos2
                                    }))}
                                    style={{
                                        padding: '0.85rem',
                                        borderRadius: '10px',
                                        border: `2px solid ${winnerModal.athleteId === winnerModal.match?.atleta_2_id ? '#ffffff' : 'var(--border-color)'}`,
                                        backgroundColor: winnerModal.athleteId === winnerModal.match?.atleta_2_id ? 'rgba(255, 255, 255, 0.1)' : 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.3rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>
                                        <div className="op-fighter-corner-indicator corner-white" />
                                        CANTO BRANCO (SHIRO)
                                    </div>
                                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                        {winnerModal.match?.atleta_2_nome || 'Atleta 2'}
                                    </span>
                                    {winnerModal.athleteId === winnerModal.match?.atleta_2_id && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 700 }}>
                                            🏆 Selecionado como Vencedor
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                                Pontuação Final Registrada no Tatame:
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

                                <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '1rem' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>
                                        {winnerModal.match?.atleta_1_nome || 'Vermelho'}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Pontos/Waza-ari</label>
                                            <select
                                                value={winnerModal.pontos1}
                                                onChange={(e) => setWinnerModal(prev => ({ ...prev, pontos1: Number(e.target.value) }))}
                                                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                            >
                                                <option value={0}>0 Pontos</option>
                                                <option value={1}>1 Waza-ari</option>
                                                <option value={2}>2 Waza-ari</option>
                                                <option value={10}>🥋 Ippon (10)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Shidos (Faltas)</label>
                                            <select
                                                value={winnerModal.punicoes1}
                                                onChange={(e) => setWinnerModal(prev => ({ ...prev, punicoes1: Number(e.target.value) }))}
                                                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                            >
                                                <option value={0}>0 Shidos</option>
                                                <option value={1}>1 Shido</option>
                                                <option value={2}>2 Shidos</option>
                                                <option value={3}>3 Shidos (Hansoku)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                                        {winnerModal.match?.atleta_2_nome || 'Branco'}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Pontos/Waza-ari</label>
                                            <select
                                                value={winnerModal.pontos2}
                                                onChange={(e) => setWinnerModal(prev => ({ ...prev, pontos2: Number(e.target.value) }))}
                                                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                            >
                                                <option value={0}>0 Pontos</option>
                                                <option value={1}>1 Waza-ari</option>
                                                <option value={2}>2 Waza-ari</option>
                                                <option value={10}>🥋 Ippon (10)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Shidos (Faltas)</label>
                                            <select
                                                value={winnerModal.punicoes2}
                                                onChange={(e) => setWinnerModal(prev => ({ ...prev, punicoes2: Number(e.target.value) }))}
                                                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                            >
                                                <option value={0}>0 Shidos</option>
                                                <option value={1}>1 Shido</option>
                                                <option value={2}>2 Shidos</option>
                                                <option value={3}>3 Shidos (Hansoku)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                                Decisão / Motivo da Vitória:
                            </label>
                            <select
                                value={winnerModal.tipoVitoria}
                                onChange={(e) => setWinnerModal(prev => ({ ...prev, tipoVitoria: e.target.value }))}
                                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                            >
                                <option value="Ippon Direto (10 pts)">🥋 Ippon Direto (10 pts)</option>
                                <option value="Waza-ari Awasete Ippon (2 Waza-ari)">🥋 Waza-ari Awasete Ippon (2 Waza-ari)</option>
                                <option value="Waza-ari (Superioridade Técnica)">⚡ Waza-ari (Superioridade Técnica)</option>
                                <option value="Hansoku-make (Desclassificação por 3 Shidos)">🚨 Hansoku-make (Desclassificação por 3 Shidos)</option>
                                <option value="Golden Score (Ponto de Ouro)">✨ Golden Score (Ponto de Ouro)</option>
                                <option value="Decisão dos Árbitros (Hantei)">⚖️ Decisão dos Árbitros (Hantei)</option>
                                <option value="Desistência / W.O.">🏳️ Desistência / W.O.</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                                Observações do Administrador (Opcional):
                            </label>
                            <input
                                type="text"
                                value={winnerModal.observacoes}
                                onChange={(e) => setWinnerModal(prev => ({ ...prev, observacoes: e.target.value }))}
                                placeholder="Ex: Luta no tatame auxiliar número 2, sem intercorrências..."
                                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                            />
                        </div>

                        <div style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: '8px',
                            padding: '0.75rem 1rem',
                            marginBottom: '1.5rem',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.4
                        }}>
                            ℹ️ <strong>Registro Oficial na Súmula:</strong> Como o cronômetro digital não foi acionado, o sistema gravará automaticamente no histórico da luta que este resultado foi validado de forma manual pela administração do evento.
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                                onClick={() => setWinnerModal({ open: false, match: null, athleteId: null, athleteNome: '', position: 1, salvando: false })}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
                                onClick={handleConfirmWinner}
                                disabled={winnerModal.salvando}
                            >
                                <CheckCircle size={18} /> {winnerModal.salvando ? 'Salvando...' : 'Confirmar & Salvar Súmula'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {checkoutData && (
                <CheckoutModal
                    isOpen={!!checkoutData}
                    onClose={() => setCheckoutData(null)}
                    tipo={checkoutData.tipo}
                    itemId={checkoutData.itemId}
                    titulo={checkoutData.titulo}
                    valor={checkoutData.valor}
                    onPaymentSuccess={carregarDados}
                />
            )}

        </div>
    );
};

export default EventoDetail;
