import { useState, useEffect } from 'react';
import { X, QrCode, CreditCard, FileText, CheckCircle2, Copy, ExternalLink, ShieldCheck, Zap, AlertCircle, Clock } from 'lucide-react';
import api from '../services/api';

const CheckoutModal = ({ isOpen, onClose, tipo, itemId, titulo, valor, onPaymentSuccess }) => {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('pix');
    const [loading, setLoading] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const [copiedPix, setCopiedPix] = useState(false);
    const [copiedBoleto, setCopiedBoleto] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [simulating, setSimulating] = useState(false);

    const [cardData, setCardData] = useState({
        number: '',
        name: '',
        expiry: '',
        cvv: '',
        cpf: '',
        installments: 1
    });

    const [boletoCpf, setBoletoCpf] = useState('');

    useEffect(() => {
        if (isOpen && !paymentData && !isPaid) {
            gerarPagamento('PIX');
        }
    }, [isOpen]);

    useEffect(() => {
        let interval = null;
        if (isOpen && !isPaid && paymentData) {
            interval = setInterval(async () => {
                try {
                    const endpoint = tipo === 'MENSALIDADE'
                        ? `/financeiro/status/mensalidade/${itemId}`
                        : `/financeiro/status/inscricao/${itemId}`;
                    const res = await api.get(endpoint);
                    if (res.data && res.data.pago) {
                        setIsPaid(true);
                        clearInterval(interval);
                        if (onPaymentSuccess) onPaymentSuccess();
                    }
                } catch (e) {

                }
            }, 2500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isOpen, isPaid, paymentData, tipo, itemId]);

    const gerarPagamento = async (metodo) => {
        setLoading(true);
        try {
            const endpoint = tipo === 'MENSALIDADE'
                ? `/financeiro/mensalidades/${itemId}/pagar`
                : `/financeiro/inscricoes/${itemId}/pagar`;

            const payload = {
                metodo: metodo,
                payer_cpf: metodo === 'BOLETO' ? boletoCpf : undefined,
                card_token: metodo === 'CARTAO_CREDITO' ? `tok_mock_${Date.now()}` : undefined,
                installments: metodo === 'CARTAO_CREDITO' ? parseInt(cardData.installments) : 1,
                payment_method_id: metodo === 'CARTAO_CREDITO' ? 'mastercard' : undefined,
                card_holder_cpf: metodo === 'CARTAO_CREDITO' ? cardData.cpf : undefined,
                card_holder_name: metodo === 'CARTAO_CREDITO' ? cardData.name : undefined
            };

            const res = await api.post(endpoint, payload);
            setPaymentData(res.data);

            if (res.data.status === 'PAGO' || res.data.status === 'approved') {
                setIsPaid(true);
                if (onPaymentSuccess) onPaymentSuccess();
            }
        } catch (error) {
            console.error("Erro ao processar pagamento:", error);
            alert(error.response?.data?.detail || "Erro ao conectar com o gateway de pagamento.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPix = () => {
        if (paymentData?.qr_code_pix) {
            navigator.clipboard.writeText(paymentData.qr_code_pix);
            setCopiedPix(true);
            setTimeout(() => setCopiedPix(false), 3000);
        }
    };

    const handleCopyBoleto = () => {
        if (paymentData?.boleto_linha_digitavel) {
            navigator.clipboard.writeText(paymentData.boleto_linha_digitavel);
            setCopiedBoleto(true);
            setTimeout(() => setCopiedBoleto(false), 3000);
        }
    };

    const handleSimularPagamento = async () => {
        setSimulating(true);
        try {
            const endpoint = tipo === 'MENSALIDADE'
                ? `/financeiro/simular-pagamento-teste/mensalidade/${itemId}`
                : `/financeiro/simular-pagamento-teste/inscricao/${itemId}`;
            await api.post(endpoint);
            setIsPaid(true);
            if (onPaymentSuccess) onPaymentSuccess();
        } catch (error) {
            alert("Erro ao simular pagamento.");
        } finally {
            setSimulating(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '560px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                animation: 'fadeIn 0.2s ease-out'
            }}>

                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-primary)'
                }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Checkout Oficial Kudow • Mercado Pago
                        </div>
                        <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                            {titulo || 'Pagamento Seguro'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{
                    padding: '1rem 1.5rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.06)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Valor a Pagar:</span>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981' }}>
                        R$ {parseFloat(valor || 0).toFixed(2).replace('.', ',')}
                    </span>
                </div>

                {isPaid ? (
                    <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.25rem auto',
                            border: '2px solid #10b981'
                        }}>
                            <CheckCircle2 size={44} />
                        </div>
                        <h2 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>Pagamento Confirmado!</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0 0 1.5rem 0' }}>
                            Sua transação foi aprovada pelo Mercado Pago. O status foi atualizado instantaneamente no sistema.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={onClose}
                            style={{ padding: '0.6rem 2rem', fontSize: '1rem', fontWeight: 700 }}
                        >
                            Concluir
                        </button>
                    </div>
                ) : (
                    <>

                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('pix'); gerarPagamento('PIX'); }}
                                style={{
                                    flex: 1,
                                    padding: '0.9rem',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'pix' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                                    color: activeTab === 'pix' ? 'var(--brand-primary)' : 'var(--text-muted)',
                                    fontWeight: activeTab === 'pix' ? 700 : 500,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                <Zap size={16} /> PIX (Instantâneo)
                            </button>

                            <button
                                type="button"
                                onClick={() => { setActiveTab('cartao'); }}
                                style={{
                                    flex: 1,
                                    padding: '0.9rem',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'cartao' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                                    color: activeTab === 'cartao' ? 'var(--brand-primary)' : 'var(--text-muted)',
                                    fontWeight: activeTab === 'cartao' ? 700 : 500,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                <CreditCard size={16} /> Cartão de Crédito
                            </button>

                            <button
                                type="button"
                                onClick={() => { setActiveTab('boleto'); if (!paymentData?.boleto_linha_digitavel) gerarPagamento('BOLETO'); }}
                                style={{
                                    flex: 1,
                                    padding: '0.9rem',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'boleto' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                                    color: activeTab === 'boleto' ? 'var(--brand-primary)' : 'var(--text-muted)',
                                    fontWeight: activeTab === 'boleto' ? 700 : 500,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                <FileText size={16} /> Boleto
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                                    <Clock size={36} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '0.75rem' }} />
                                    <div>Gerando ordem no Mercado Pago...</div>
                                </div>
                            ) : (
                                <>

                                    {activeTab === 'pix' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>

                                            <div style={{
                                                backgroundColor: 'white',
                                                padding: '1rem',
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '200px',
                                                height: '200px'
                                            }}>
                                                {paymentData?.qr_code_base64 ? (
                                                    <img
                                                        src={`data:image/png;base64,${paymentData.qr_code_base64}`}
                                                        alt="QR Code PIX Mercado Pago"
                                                        style={{ width: '100%', height: '100%' }}
                                                    />
                                                ) : (
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(paymentData?.qr_code_pix || 'PIX_KUDOW')}`}
                                                        alt="QR Code PIX"
                                                        style={{ width: '100%', height: '100%' }}
                                                    />
                                                )}
                                            </div>

                                            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                Abra o app do seu banco e escaneie o QR Code acima ou use o código Copia e Cola:
                                            </div>

                                            <div style={{ width: '100%', display: 'flex', gap: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={paymentData?.qr_code_pix || 'Carregando código...'}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.6rem 0.8rem',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border-color)',
                                                        backgroundColor: 'var(--bg-primary)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '0.8rem',
                                                        fontFamily: 'monospace'
                                                    }}
                                                />
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={handleCopyPix}
                                                    style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                                                >
                                                    <Copy size={16} />
                                                    {copiedPix ? 'Copiado!' : 'Copiar'}
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--brand-primary)', backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                                                <ShieldCheck size={16} /> Aguardando pagamento... Detecção automática em tempo real.
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'cartao' && (
                                        <form onSubmit={(e) => { e.preventDefault(); gerarPagamento('CARTAO_CREDITO'); }} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Número do Cartão</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="0000 0000 0000 0000"
                                                    maxLength="19"
                                                    value={cardData.number}
                                                    onChange={e => setCardData({ ...cardData, number: e.target.value })}
                                                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Nome Impresso no Cartão</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="NOME COMO NO CARTAO"
                                                    value={cardData.name}
                                                    onChange={e => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                                                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Validade</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="MM/AA"
                                                        maxLength="5"
                                                        value={cardData.expiry}
                                                        onChange={e => setCardData({ ...cardData, expiry: e.target.value })}
                                                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>CVV</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="123"
                                                        maxLength="4"
                                                        value={cardData.cvv}
                                                        onChange={e => setCardData({ ...cardData, cvv: e.target.value })}
                                                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>CPF do Titular</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="000.000.000-00"
                                                        maxLength="14"
                                                        value={cardData.cpf}
                                                        onChange={e => setCardData({ ...cardData, cpf: e.target.value })}
                                                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Parcelamento</label>
                                                    <select
                                                        value={cardData.installments}
                                                        onChange={e => setCardData({ ...cardData, installments: e.target.value })}
                                                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                    >
                                                        <option value="1">1x de R$ {parseFloat(valor).toFixed(2)} (à vista)</option>
                                                        <option value="2">2x de R$ {(parseFloat(valor) / 2).toFixed(2)}</option>
                                                        <option value="3">3x de R$ {(parseFloat(valor) / 3).toFixed(2)}</option>
                                                        <option value="6">6x de R$ {(parseFloat(valor) / 6).toFixed(2)}</option>
                                                        <option value="12">12x de R$ {(parseFloat(valor) / 12).toFixed(2)}</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={loading}
                                                style={{ marginTop: '0.5rem', padding: '0.75rem', fontWeight: 700, fontSize: '0.95rem' }}
                                            >
                                                {loading ? 'Processando...' : `Pagar R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`}
                                            </button>
                                        </form>
                                    )}

                                    {activeTab === 'boleto' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                O boleto pode ser pago em qualquer banco ou aplicativo até o vencimento:
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Linha Digitável:</label>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={paymentData?.boleto_linha_digitavel || 'Gerando linha digitável...'}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.6rem 0.8rem',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border-color)',
                                                            backgroundColor: 'var(--bg-primary)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '0.85rem',
                                                            fontFamily: 'monospace'
                                                        }}
                                                    />
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={handleCopyBoleto}
                                                        style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                                                    >
                                                        <Copy size={16} />
                                                        {copiedBoleto ? 'Copiado!' : 'Copiar'}
                                                    </button>
                                                </div>
                                            </div>

                                            {paymentData?.boleto_pdf_url && (
                                                <a
                                                    href={paymentData.boleto_pdf_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.75rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', fontWeight: 600 }}
                                                >
                                                    <FileText size={18} /> Abrir Boleto em PDF <ExternalLink size={14} />
                                                </a>
                                            )}

                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                                ℹ️ A compensação bancária do boleto ocorre em até 1 a 2 dias úteis.
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'var(--bg-primary)',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                🔒 Ambiente Seguro Mercado Pago
                            </div>

                            <button
                                type="button"
                                onClick={handleSimularPagamento}
                                disabled={simulating || isPaid}
                                style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    color: '#3b82f6',
                                    borderRadius: '6px',
                                    padding: '4px 10px',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                }}
                                title="Aprova o pagamento imediatamente em ambiente de desenvolvimento"
                            >
                                <Zap size={12} /> {simulating ? 'Aprovando...' : '⚡ Simular Aprovação no Banco (Sandbox)'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CheckoutModal;
