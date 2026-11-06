import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Maximize2, Minimize2, Trophy, Zap, Shield } from 'lucide-react';
import api, { WS_BASE_URL } from '../services/api';

const Placar = () => {
    const [searchParams] = useSearchParams();
    const partidaId = searchParams.get('partida_id');

    const [partida, setPartida] = useState(null);
    const [pontosAka, setPontosAka] = useState(0);
    const [pontosShiro, setPontosShiro] = useState(0);
    const [punicoesAka, setPunicoesAka] = useState(0);
    const [punicoesShiro, setPunicoesShiro] = useState(0);
    const [tempoRestante, setTempoRestante] = useState(180);
    const [statusPartida, setStatusPartida] = useState('PRONTO');
    const [observacoesArbitro, setObservacoesArbitro] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const socketRef = useRef(null);
    const bcRef = useRef(null);

    useEffect(() => {
        if (!partidaId) return;

        const channelName = `kudow_placar_${partidaId}`;
        const bc = new BroadcastChannel(channelName);
        bcRef.current = bc;

        bc.onmessage = (event) => {
            const data = event.data;
            if (!data) return;
            if (data.pontos_atleta_1 !== undefined) setPontosAka(data.pontos_atleta_1);
            if (data.pontos_atleta_2 !== undefined) setPontosShiro(data.pontos_atleta_2);
            if (data.punicoes_atleta_1 !== undefined) setPunicoesAka(data.punicoes_atleta_1);
            if (data.punicoes_atleta_2 !== undefined) setPunicoesShiro(data.punicoes_atleta_2);
            if (data.tempo_restante_segundos !== undefined) setTempoRestante(data.tempo_restante_segundos);
            if (data.status_partida) setStatusPartida(data.status_partida);
            if (data.observacoes_arbitro !== undefined) setObservacoesArbitro(data.observacoes_arbitro);
        };

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

                const resPlacar = await api.get(`/placar/partidas/${partidaId}/estado`);
                if (resPlacar.data) {
                    setPontosAka(resPlacar.data.pontos_atleta_1 || 0);
                    setPontosShiro(resPlacar.data.pontos_atleta_2 || 0);
                    setPunicoesAka(resPlacar.data.punicoes_atleta_1 || 0);
                    setPunicoesShiro(resPlacar.data.punicoes_atleta_2 || 0);
                    setTempoRestante(resPlacar.data.tempo_restante_segundos ?? 180);
                    if (resPlacar.data.status_partida) setStatusPartida(resPlacar.data.status_partida);
                    if (resPlacar.data.observacoes_arbitro) setObservacoesArbitro(resPlacar.data.observacoes_arbitro);
                }
            } catch {}
        };

        carregarDadosIniciais();

        const wsUrl = `${WS_BASE_URL}/placar/ws/partidas/${partidaId}`;
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
                    if (data.status_partida) setStatusPartida(data.status_partida);
                    if (data.observacoes_arbitro !== undefined) setObservacoesArbitro(data.observacoes_arbitro);
                } catch {}
            };
        } catch {}

        return () => {
            if (ws) ws.close();
            if (bc) bc.close();
        };
    }, [partidaId]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    };

    const formatarTempo = (segundos) => {
        const m = Math.floor(Math.abs(segundos) / 60);
        const s = Math.abs(segundos) % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const ipponAka = pontosAka >= 10 || pontosAka >= 2 ? 1 : 0;
    const wazaAriAka = pontosAka === 1 ? 1 : (pontosAka >= 2 && pontosAka < 10 ? 2 : 0);

    const ipponShiro = pontosShiro >= 10 || pontosShiro >= 2 ? 1 : 0;
    const wazaAriShiro = pontosShiro === 1 ? 1 : (pontosShiro >= 2 && pontosShiro < 10 ? 2 : 0);

    const isGoldenScore = statusPartida === 'GOLDEN_SCORE';

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            backgroundColor: '#030712',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            userSelect: 'none',
            overflow: 'hidden'
        }}>

            <header style={{
                padding: '1.25rem 3rem',
                backgroundColor: 'rgba(15, 23, 42, 0.98)',
                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-primary)'
                    }}>
                        <Trophy size={26} />
                    </div>
                    <div>
                        <h1 style={{
                            margin: 0,
                            fontSize: '1.75rem',
                            fontWeight: '900',
                            letterSpacing: '0.5px',
                            color: '#f8fafc',
                            textTransform: 'uppercase'
                        }}>
                            {partida?.evento_nome || 'CAMPEONATO OFICIAL DE JUDÔ'}
                        </h1>
                        <p style={{
                            margin: '0.15rem 0 0 0',
                            color: '#94a3b8',
                            fontSize: '1rem',
                            fontWeight: '600'
                        }}>
                            CATEGORIA: <span style={{ color: '#ffffff' }}>{partida?.categoria_nome || 'GERAL / SÊNIOR'}</span>
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{
                        textAlign: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        padding: '0.5rem 1.5rem',
                        borderRadius: '12px'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            FASE OFICIAL
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--brand-primary)' }}>
                            {partida?.fase || 'OITAVAS DE FINAL'}
                        </div>
                    </div>

                    <div style={{
                        textAlign: 'center',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '0.5rem 1.5rem',
                        borderRadius: '12px'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            CONFRONTO
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ef4444' }}>
                            LUTA #{partida?.numero_luta || partidaId}
                        </div>
                    </div>

                    <button
                        onClick={toggleFullscreen}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '0.6rem',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.2s ease'
                        }}
                        title="Alternar Tela Cheia"
                    >
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                </div>
            </header>

            <main style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 380px 1fr',
                gap: '2rem',
                padding: '2rem 3rem',
                alignItems: 'stretch'
            }}>

                <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.04)',
                    border: '3.5px solid #ef4444',
                    borderRadius: '24px',
                    padding: '2.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 0 50px rgba(239, 68, 68, 0.15)'
                }}>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <span style={{
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                padding: '6px 18px',
                                borderRadius: '8px',
                                fontWeight: '900',
                                fontSize: '1.1rem',
                                letterSpacing: '1px'
                            }}>
                                VERMELHO (AKA)
                            </span>
                            <span style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: '#f8fafc',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontWeight: '800',
                                fontSize: '1.05rem',
                                border: '1px solid rgba(255, 255, 255, 0.15)'
                            }}>
                                UF: {partida?.atleta_1_estado || 'SP'}
                            </span>
                        </div>

                        <h2 style={{
                            fontSize: '3.4rem',
                            margin: '0 0 0.4rem 0',
                            fontWeight: '900',
                            lineHeight: 1.05,
                            letterSpacing: '-0.5px',
                            color: '#ffffff',
                            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                        }}>
                            {partida?.atleta_1_nome || 'Atleta Canto Vermelho'}
                        </h2>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '1.3rem', fontWeight: '600' }}>
                            {partida?.atleta_1_entidade || 'Federação Kudow'}
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1.5rem',
                        margin: 'auto 0',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        padding: '1.5rem',
                        borderRadius: '20px',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>

                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <span style={{ fontSize: '1.1rem', color: '#94a3b8', fontWeight: '800', letterSpacing: '2px' }}>
                                IPPON (I)
                            </span>
                            <div style={{
                                fontSize: '8.5rem',
                                fontWeight: '900',
                                lineHeight: 1,
                                color: ipponAka > 0 ? '#ef4444' : '#475569',
                                textShadow: ipponAka > 0 ? '0 0 35px rgba(239, 68, 68, 0.8)' : 'none'
                            }}>
                                {ipponAka}
                            </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '1.1rem', color: '#94a3b8', fontWeight: '800', letterSpacing: '2px' }}>
                                WAZA-ARI (W)
                            </span>
                            <div style={{
                                fontSize: '8.5rem',
                                fontWeight: '900',
                                lineHeight: 1,
                                color: wazaAriAka > 0 ? '#ffffff' : '#475569',
                                textShadow: wazaAriAka > 0 ? '0 0 25px rgba(255, 255, 255, 0.5)' : 'none'
                            }}>
                                {wazaAriAka}
                            </div>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '2px solid rgba(239, 68, 68, 0.25)',
                        paddingTop: '1.5rem'
                    }}>
                        <div>
                            <span style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: '800', letterSpacing: '1px' }}>
                                PENALIDADES (SHIDO)
                            </span>
                            {punicoesAka === 3 && (
                                <span style={{ display: 'block', color: '#ef4444', fontWeight: '900', fontSize: '0.9rem', marginTop: '2px' }}>
                                    🚨 HANSOKU-MAKE (DESCLASSIFICADO)
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.85rem' }}>
                            {[1, 2, 3].map(num => {
                                const isActive = punicoesAka >= num;
                                return (
                                    <div
                                        key={num}
                                        style={{
                                            width: '46px',
                                            height: '46px',
                                            borderRadius: '50%',
                                            backgroundColor: isActive ? (num === 3 ? '#ef4444' : '#f59e0b') : 'rgba(255, 255, 255, 0.06)',
                                            border: `2.5px solid ${isActive ? (num === 3 ? '#ef4444' : '#f59e0b') : 'rgba(255, 255, 255, 0.15)'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.1rem',
                                            fontWeight: '900',
                                            color: isActive ? '#000000' : '#475569',
                                            boxShadow: isActive ? (num === 3 ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 0 15px rgba(245, 158, 11, 0.5)') : 'none'
                                        }}
                                    >
                                        S{num}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    border: isGoldenScore ? '3px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '24px',
                    padding: '2.5rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: isGoldenScore ? '0 0 50px rgba(245, 158, 11, 0.35)' : '0 10px 40px rgba(0,0,0,0.6)'
                }}>
                    <span style={{
                        fontSize: '1.1rem',
                        color: isGoldenScore ? '#f59e0b' : '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '3px',
                        fontWeight: '900',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        {isGoldenScore ? <Zap size={20} /> : null}
                        {isGoldenScore ? 'GOLDEN SCORE' : 'TEMPO DE LUTA'}
                    </span>

                    <div style={{
                        fontSize: '6.2rem',
                        fontWeight: '900',
                        fontFamily: 'monospace',
                        color: isGoldenScore ? '#f59e0b' : (tempoRestante <= 30 ? '#ef4444' : '#ffffff'),
                        textShadow: isGoldenScore ? '0 0 35px rgba(245, 158, 11, 0.8)' : (tempoRestante <= 30 ? '0 0 35px rgba(239, 68, 68, 0.8)' : '0 0 25px rgba(255, 255, 255, 0.3)'),
                        letterSpacing: '2px',
                        lineHeight: 1
                    }}>
                        {formatarTempo(tempoRestante)}
                    </div>

                    <div style={{
                        backgroundColor: isGoldenScore ? 'rgba(245, 158, 11, 0.25)' : (statusPartida === 'FINALIZADA' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'),
                        color: isGoldenScore ? '#f59e0b' : (statusPartida === 'FINALIZADA' ? '#ef4444' : '#10b981'),
                        border: `1.5px solid ${isGoldenScore ? '#f59e0b' : (statusPartida === 'FINALIZADA' ? '#ef4444' : '#10b981')}`,
                        padding: '10px 28px',
                        borderRadius: '30px',
                        fontWeight: '900',
                        fontSize: '1.05rem',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase'
                    }}>
                        ● {isGoldenScore ? 'GOLDEN SCORE' : (statusPartida === 'PRONTO' ? 'EM ABERTO' : statusPartida)}
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '3.5px solid #ffffff',
                    borderRadius: '24px',
                    padding: '2.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 0 50px rgba(255, 255, 255, 0.1)'
                }}>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <span style={{
                                backgroundColor: '#ffffff',
                                color: '#000000',
                                padding: '6px 18px',
                                borderRadius: '8px',
                                fontWeight: '900',
                                fontSize: '1.1rem',
                                letterSpacing: '1px'
                            }}>
                                BRANCO (SHIRO)
                            </span>
                            <span style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: '#f8fafc',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontWeight: '800',
                                fontSize: '1.05rem',
                                border: '1px solid rgba(255, 255, 255, 0.15)'
                            }}>
                                UF: {partida?.atleta_2_estado || 'SP'}
                            </span>
                        </div>

                        <h2 style={{
                            fontSize: '3.4rem',
                            margin: '0 0 0.4rem 0',
                            fontWeight: '900',
                            lineHeight: 1.05,
                            letterSpacing: '-0.5px',
                            color: '#ffffff',
                            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                        }}>
                            {partida?.atleta_2_nome || 'Atleta Canto Branco'}
                        </h2>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '1.3rem', fontWeight: '600' }}>
                            {partida?.atleta_2_entidade || 'Federação Kudow'}
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1.5rem',
                        margin: 'auto 0',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        padding: '1.5rem',
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>

                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <span style={{ fontSize: '1.1rem', color: '#94a3b8', fontWeight: '800', letterSpacing: '2px' }}>
                                IPPON (I)
                            </span>
                            <div style={{
                                fontSize: '8.5rem',
                                fontWeight: '900',
                                lineHeight: 1,
                                color: ipponShiro > 0 ? '#ffffff' : '#475569',
                                textShadow: ipponShiro > 0 ? '0 0 35px rgba(255, 255, 255, 0.9)' : 'none'
                            }}>
                                {ipponShiro}
                            </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '1.1rem', color: '#94a3b8', fontWeight: '800', letterSpacing: '2px' }}>
                                WAZA-ARI (W)
                            </span>
                            <div style={{
                                fontSize: '8.5rem',
                                fontWeight: '900',
                                lineHeight: 1,
                                color: wazaAriShiro > 0 ? '#ffffff' : '#475569',
                                textShadow: wazaAriShiro > 0 ? '0 0 25px rgba(255, 255, 255, 0.5)' : 'none'
                            }}>
                                {wazaAriShiro}
                            </div>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '2px solid rgba(255, 255, 255, 0.2)',
                        paddingTop: '1.5rem'
                    }}>
                        <div>
                            <span style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: '800', letterSpacing: '1px' }}>
                                PENALIDADES (SHIDO)
                            </span>
                            {punicoesShiro === 3 && (
                                <span style={{ display: 'block', color: '#ef4444', fontWeight: '900', fontSize: '0.9rem', marginTop: '2px' }}>
                                    🚨 HANSOKU-MAKE (DESCLASSIFICADO)
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.85rem' }}>
                            {[1, 2, 3].map(num => {
                                const isActive = punicoesShiro >= num;
                                return (
                                    <div
                                        key={num}
                                        style={{
                                            width: '46px',
                                            height: '46px',
                                            borderRadius: '50%',
                                            backgroundColor: isActive ? (num === 3 ? '#ef4444' : '#f59e0b') : 'rgba(255, 255, 255, 0.06)',
                                            border: `2.5px solid ${isActive ? (num === 3 ? '#ef4444' : '#f59e0b') : 'rgba(255, 255, 255, 0.15)'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.1rem',
                                            fontWeight: '900',
                                            color: isActive ? '#000000' : '#475569',
                                            boxShadow: isActive ? (num === 3 ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 0 15px rgba(245, 158, 11, 0.5)') : 'none'
                                        }}
                                    >
                                        S{num}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>

            {observacoesArbitro && (
                <footer style={{
                    padding: '0.85rem 3rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.98)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    color: '#e2e8f0',
                    fontSize: '0.95rem'
                }}>
                    <span style={{ fontWeight: '900', color: 'var(--brand-primary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Shield size={16} /> SÚMULA & OBSERVAÇÃO OFICIAL DO ÁRBITRO:
                    </span>
                    <marquee behavior="scroll" direction="left" style={{ color: '#94a3b8', fontWeight: '500' }}>
                        {observacoesArbitro.replace(/\n/g, '  •  ')}
                    </marquee>
                </footer>
            )}
        </div>
    );
};

export default Placar;
