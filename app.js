/**
 * App.js — Portal Investidor Finanças
 * SPA simples: navega entre Home e Ficha do Ativo sem recarregar.
 * Suporta Ações (fundamentalistas + gráficos) e FIIs (quantitativo + gráficos).
 */

const API_BASE = '/api/v1';

// Helper genérico compartilhado pela calculadora legada de bancos.
// Preservado com a mesma semântica do arquivo de empresas anterior.
function clamp(val, min_val, max_val) {
    return Math.max(min_val, Math.min(val, max_val));
}

function formatPercent(val) {
    return (val * 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + '%';
}

// Controle de ordenação do Ranking
window.rankingSortCol = null;
window.rankingSortDir = 'asc';

// ====================== TOAST PREMIUM (paywall inline) ======================

/**
 * Exibe um toast premium elegante posicionado junto ao elemento clicado.
 * @param {string} mensagem - Texto a exibir
 * @param {HTMLElement|null} anchorEl - Elemento de referência para posicionar o toast
 */
function mostrarToastPremium(mensagem, anchorEl) {
    // Remove toast anterior se existir
    const old = document.getElementById('toast-premium');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-premium';
    toast.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">🔒</span>
            <span>${mensagem}</span>
        </div>
    `;
    Object.assign(toast.style, {
        position: 'fixed',
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        color: '#f8fafc',
        padding: '12px 20px',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
        zIndex: '99999',
        opacity: '0',
        transform: 'translateY(8px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        pointerEvents: 'none',
        maxWidth: '360px',
        border: '1px solid #f59e0b'
    });

    document.body.appendChild(toast);

    // Posicionar junto ao elemento âncora
    if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        const tw = toast.offsetWidth;
        let left = rect.right - tw;
        if (left < 8) left = 8;
        if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;
        toast.style.left = left + 'px';
        toast.style.top = (rect.bottom + 10) + 'px';
    } else {
        toast.style.top = '20px';
        toast.style.right = '20px';
    }

    // Animar entrada
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Auto-remover após 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ====================== AUTENTICAÇÃO ======================

const originalFetch = window.fetch;
window.fetch = async function () {
    let [resource, config] = arguments;
    if (!config) config = {};
    if (!config.headers) config.headers = {};
    
    const token = localStorage.getItem('token');
    if (token && typeof resource === 'string' && resource.includes(API_BASE) && !resource.includes('/auth/login')) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await originalFetch(resource, config);
    
    if (response.status === 401 && typeof resource === 'string' && !resource.includes('/auth/login')) {
        fazerLogout();
    }
    return response;
};

async function verificarLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    const verifyToken = urlParams.get('verify');
    
    const loginContainer = document.getElementById('login-container');
    const resetContainer = document.getElementById('reset-password-container');
    const appSidebar = document.getElementById('app-sidebar');
    const appMain = document.getElementById('app');
    
    // Se há um token de reset na URL, exibe a tela de reset e oculta as demais
    if (resetToken) {
        if (loginContainer) loginContainer.style.display = 'none';
        if (appSidebar) appSidebar.style.display = 'none';
        if (appMain) appMain.style.display = 'none';
        if (resetContainer) resetContainer.style.display = 'flex';
        return false; // Não inicializa o app
    }
    
    // Se há um token de verificação na URL, exibe a tela de verificação e oculta as demais
    if (verifyToken) {
        if (loginContainer) loginContainer.style.display = 'none';
        if (appSidebar) appSidebar.style.display = 'none';
        if (appMain) appMain.style.display = 'none';
        
        const verifyContainer = document.getElementById('verify-container');
        if (verifyContainer) verifyContainer.style.display = 'flex';
        
        executarVerificacao(verifyToken);
        return false; // Não inicializa o app
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        if (loginContainer) loginContainer.style.display = 'flex';
        if (appSidebar) appSidebar.style.display = 'none';
        if (appMain) appMain.style.display = 'none';
        return false;
    }
    if (loginContainer) loginContainer.style.display = 'none';
    if (appSidebar) appSidebar.style.display = 'flex';
    if (appMain) appMain.style.display = 'block';
    
    // Dispara a busca do perfil para saber se é trial/premium e aguarda
    await carregarPerfilUsuario();
    
    navegarPara('home');
    return true;
}

async function carregarPerfilUsuario() {
    try {
        const resp = await fetch(`${API_BASE}/auth/me`);
        if (!resp.ok) return;
        
        const user = await resp.json();
        localStorage.setItem('user_plano', user.nome_plano);
        localStorage.setItem('user_plano_id', user.plano_id);
        localStorage.setItem('is_trial', user.is_trial_active);
        localStorage.setItem('is_admin', user.is_admin);
        
        const banner = document.getElementById('trial-banner');
        const daysText = document.getElementById('trial-days-text');
        
        const userPlanoId = parseInt(user.plano_id) || 0;
        const isPremiumReal = userPlanoId === 2 || user.nome_plano === 'Premium';
        const isAdm = userPlanoId === 9 || user.is_admin === true || user.is_admin === "true";
        
        if (user.is_trial_active && !isPremiumReal && !isAdm) {
            if (banner) banner.style.display = 'flex';
            if (daysText) daysText.innerText = `Você tem ${user.dias_restantes} dias restantes para testar todos os recursos avançados.`;
        } else {
            if (banner) banner.style.display = 'none';
        }

        // --- Atualiza os elementos de Perfil no Menu Lateral ---
        const userAvatar = document.getElementById('user-avatar');
        const userDisplayName = document.getElementById('user-display-name');
        const userDisplayPlan = document.getElementById('user-display-plan');
        const userMenuEmail = document.getElementById('user-menu-email');
        const userMenuPlan = document.getElementById('user-menu-plan');
        
        if (user) {
            const nomeExibido = user.nome_completo || 'Usuário';
            const emailExibido = user.email || '';
            
            // Define o avatar usando a primeira letra
            if (userAvatar) {
                userAvatar.innerText = nomeExibido.charAt(0).toUpperCase();
            }
            if (userDisplayName) {
                userDisplayName.innerText = nomeExibido;
            }
            if (userMenuEmail) {
                userMenuEmail.innerText = emailExibido;
            }
            
            // Determina a string do plano real contratado (Adm, Premium ou Gratuito), independente de Trial ativo
            const userPlanoId = parseInt(user.plano_id) || 0;
            let planoExibido = 'Gratuito';
            if (userPlanoId === 9 || user.is_admin) {
                planoExibido = 'Adm';
            } else if (userPlanoId === 2 || user.nome_plano === 'Premium') {
                planoExibido = 'Premium';
            } else {
                planoExibido = 'Gratuito';
            }
            
            if (userDisplayPlan) {
                userDisplayPlan.innerText = planoExibido;
            }
            if (userMenuPlan) {
                userMenuPlan.innerText = planoExibido;
            }
        }
    } catch (err) {
        console.error("Erro ao carregar perfil:", err);
    }
}

// Controle do Popover do Perfil do Usuário
window.toggleUserProfileMenu = function(event) {
    if (event) {
        event.stopPropagation();
    }
    const menu = document.getElementById('user-profile-menu');
    if (!menu) return;
    
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
};

// Event listener para fechar o menu de configurações do usuário ao clicar fora
document.addEventListener('click', function(event) {
    const menu = document.getElementById('user-profile-menu');
    const container = document.querySelector('.user-profile-container');
    if (menu && menu.style.display === 'block') {
        if (container && !container.contains(event.target)) {
            menu.style.display = 'none';
        }
    }
});

// Event listener para fechar o menu de configurações quando o cursor sair da sidebar (evitando que o menu fique flutuando fora da barra recolhida)
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) {
        sidebar.addEventListener('mouseleave', function() {
            const menu = document.getElementById('user-profile-menu');
            if (menu && menu.style.display === 'block') {
                menu.style.display = 'none';
            }
        });
    }
});

function mostrarEsqueciSenha() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('forgot-password-container').style.display = 'flex';
}

function mostrarCadastro() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'flex';
}

function voltarParaLogin() {
    document.getElementById('forgot-password-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
}

function voltarParaLoginGeral() {
    document.getElementById('register-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
}

async function realizarCadastro(event) {
    event.preventDefault();
    const nome = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const senha = document.getElementById('reg-password').value;
    const msgEl = document.getElementById('reg-msg');
    const btn = document.getElementById('reg-btn');
    
    try {
        btn.innerHTML = '⏳ Criando...';
        btn.disabled = true;
        
        const resp = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ nome_completo: nome, email: email, senha: senha })
        });
        
        const data = await resp.json();
        
        if (!resp.ok) {
            msgEl.style.display = 'block';
            msgEl.style.color = '#ef4444';
            msgEl.style.background = 'rgba(239, 68, 68, 0.1)';
            msgEl.innerText = data.detail || 'Erro ao criar conta.';
            return;
        }
        
        msgEl.style.display = 'block';
        msgEl.style.color = '#16a34a';
        msgEl.style.background = 'rgba(22, 163, 74, 0.1)';
        msgEl.innerText = 'Cadastro realizado! Enviamos um link de confirmação para o seu e-mail. Por favor, ative a conta antes de fazer o login.';
        
        // Limpar os campos do form
        document.getElementById('reg-name').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
        
        // Alterar botão para voltar para o login
        btn.innerHTML = 'Voltar para Login';
        btn.type = 'button';
        btn.onclick = () => {
            // Restaura o botão original
            btn.innerHTML = 'Criar Conta e Entrar';
            btn.type = 'submit';
            btn.onclick = null;
            voltarParaLoginGeral();
        };
        
    } catch (err) {
        msgEl.style.display = 'block';
        msgEl.style.color = '#ef4444';
        msgEl.style.background = 'rgba(239, 68, 68, 0.1)';
        msgEl.innerText = 'Ocorreu um erro de rede.';
    } finally {
        if(btn.innerHTML.includes('Criando')) {
            btn.innerHTML = 'Criar Conta e Entrar';
            btn.disabled = false;
        }
    }
}

async function solicitarRecuperacao(event) {
    event.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const msgEl = document.getElementById('forgot-msg');
    const btn = document.getElementById('forgot-btn');
    
    try {
        btn.innerHTML = '⏳ Enviando...';
        btn.disabled = true;
        
        const resp = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: email })
        });
        
        const data = await resp.json();
        msgEl.style.display = 'block';
        msgEl.style.color = '#16a34a';
        msgEl.style.background = 'rgba(22, 163, 74, 0.1)';
        msgEl.innerText = data.msg || 'Link enviado com sucesso!';
    } catch (err) {
        msgEl.style.display = 'block';
        msgEl.style.color = '#ef4444';
        msgEl.style.background = 'rgba(239, 68, 68, 0.1)';
        msgEl.innerText = 'Ocorreu um erro. Tente novamente.';
    } finally {
        btn.innerHTML = 'Enviar Link';
        btn.disabled = false;
    }
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerText = '🙈';
    } else {
        input.type = 'password';
        btn.innerText = '👁️';
    }
}

async function enviarNovaSenha(event) {
    event.preventDefault();
    const newPassword = document.getElementById('reset-new-password').value;
    const confirmPassword = document.getElementById('reset-confirm-password').value;
    const msgEl = document.getElementById('reset-msg');
    
    if (newPassword !== confirmPassword) {
        msgEl.style.display = 'block';
        msgEl.style.color = '#ef4444';
        msgEl.style.background = 'rgba(239, 68, 68, 0.1)';
        msgEl.innerText = 'As senhas não coincidem. Verifique e tente novamente.';
        return;
    }
    
    const btn = document.getElementById('reset-btn');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    try {
        btn.innerHTML = '⏳ Atualizando...';
        btn.disabled = true;
        
        const resp = await fetch(`${API_BASE}/auth/reset-password`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token: token, new_password: newPassword })
        });
        
        const data = await resp.json();
        msgEl.style.display = 'block';
        
        if (!resp.ok) {
            msgEl.style.color = '#ef4444';
            msgEl.style.background = 'rgba(239, 68, 68, 0.1)';
            msgEl.innerText = data.detail || 'Erro ao atualizar senha.';
        } else {
            msgEl.style.color = '#16a34a';
            msgEl.style.background = 'rgba(22, 163, 74, 0.1)';
            msgEl.innerText = 'Senha atualizada! Redirecionando...';
            setTimeout(() => {
                window.location.href = '/'; // Remove o token da URL e vai pro login
            }, 2000);
        }
    } catch (err) {
        msgEl.style.display = 'block';
        msgEl.style.color = '#ef4444';
        msgEl.style.background = 'rgba(239, 68, 68, 0.1)';
        msgEl.innerText = 'Ocorreu um erro de rede.';
    } finally {
        if(btn.innerHTML.includes('Atualizando')) {
            btn.innerHTML = 'Atualizar Senha';
            btn.disabled = false;
        }
    }
}

async function realizarLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    
    // Reverte a cor padrão do erro
    errorEl.style.color = '#ef4444';
    
    try {
        btn.innerHTML = '⏳ Entrando...';
        btn.disabled = true;
        
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);
        
        const resp = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            body: formData
        });
        
        if (!resp.ok) {
            const errData = await resp.json();
            throw new Error(errData.detail || 'Falha no login');
        }
        
        const data = await resp.json();
        localStorage.setItem('token', data.access_token);
        
        errorEl.style.display = 'none';
        await verificarLogin();
        
        // Inicializa o app
        await carregarCenarios();
        await carregarSegmentos();
        carregarRanking();
    } catch (err) {
        errorEl.style.display = 'block';
        errorEl.innerText = err.message || 'Credenciais inválidas.';
        if (err.message && err.message.toLowerCase().includes('ativada')) {
            errorEl.innerHTML = `${err.message}<br><a href="#" onclick="solicitarReenvioConfirmacao('${email}'); return false;" style="color: var(--accent-blue); font-weight: 600; text-decoration: underline; display: inline-block; margin-top: 8px;">Reenviar e-mail de ativação</a>`;
        }
    } finally {
        btn.innerHTML = 'Entrar no Terminal';
        btn.disabled = false;
    }
}

async function executarVerificacao(token) {
    const iconEl = document.getElementById('verify-icon');
    const titleEl = document.getElementById('verify-title');
    const msgEl = document.getElementById('verify-msg');
    const btnEl = document.getElementById('verify-btn');
    
    try {
        const resp = await fetch(`${API_BASE}/auth/verify-email`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token: token })
        });
        
        const data = await resp.json();
        
        if (resp.ok) {
            iconEl.innerText = '✅';
            titleEl.innerText = 'Conta Ativada!';
            msgEl.innerText = data.msg || 'Sua conta foi ativada com sucesso. Agora você pode fazer login no terminal.';
            msgEl.style.color = '#16a34a';
            msgEl.style.background = 'rgba(22, 163, 74, 0.1)';
        } else {
            iconEl.innerText = '❌';
            titleEl.innerText = 'Falha na Ativação';
            msgEl.innerText = data.detail || 'O link de ativação é inválido ou expirou.';
            msgEl.style.color = '#ef4444';
            msgEl.style.background = 'rgba(239, 68, 68, 0.1)';
        }
    } catch (err) {
        iconEl.innerText = '❌';
        titleEl.innerText = 'Erro de Rede';
        msgEl.innerText = 'Não foi possível se conectar ao servidor.';
        msgEl.style.color = '#ef4444';
        msgEl.style.background = 'rgba(239, 68, 68, 0.1)';
    } finally {
        if (btnEl) btnEl.style.display = 'block';
    }
}

async function solicitarReenvioConfirmacao(email) {
    const errorEl = document.getElementById('login-error');
    try {
        errorEl.innerText = '⏳ Enviando novo link...';
        const resp = await fetch(`${API_BASE}/auth/resend-verification`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: email })
        });
        const data = await resp.json();
        errorEl.style.color = '#16a34a';
        errorEl.innerText = data.msg || 'Novo e-mail de confirmação enviado!';
    } catch (err) {
        errorEl.style.color = '#ef4444';
        errorEl.innerText = 'Erro ao reenviar e-mail de confirmação.';
    }
}

function fazerLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user_plano');
    localStorage.removeItem('is_trial');
    localStorage.removeItem('is_admin');
    verificarLogin(); // Isso redirecionará para login
}

// ====================== NAVEGAÇÃO ======================

function navegarPara(pagina, ticker = null, elementoClick = null, opcoes = null) {
    document.getElementById('pagina-home').style.display = 'none';
    document.getElementById('pagina-ativo').style.display = 'none';
    document.getElementById('pagina-calculadora').style.display = 'none';
    document.getElementById('pagina-valuation-empresas').style.display = 'none';
    document.getElementById('pagina-valuation-bancos').style.display = 'none';
    if (document.getElementById('pagina-manual')) document.getElementById('pagina-manual').style.display = 'none';
    if (document.getElementById('pagina-indicadores-resumo')) document.getElementById('pagina-indicadores-resumo').style.display = 'none';
    if (document.getElementById('pagina-indicadores-juro-real')) document.getElementById('pagina-indicadores-juro-real').style.display = 'none';
    if (document.getElementById('pagina-indicadores-curva')) document.getElementById('pagina-indicadores-curva').style.display = 'none';

    if (pagina === 'home' || pagina === 'ranking') {
        document.getElementById('pagina-home').style.display = 'block';
    } else if (pagina === 'ativo') {
        document.getElementById('pagina-ativo').style.display = 'block';
    } else if (pagina === 'calculadora') {
        document.getElementById('pagina-calculadora').style.display = 'block';
    } else if (pagina === 'valuation_empresas' || pagina === 'valuation_bancos') {
        const userPlano = localStorage.getItem('user_plano');
        const userPlanoId = parseInt(localStorage.getItem('user_plano_id'));
        const isTrial = localStorage.getItem('is_trial') === 'true';
        const isAdmin = localStorage.getItem('is_admin') === 'true';
        const hasAccess = userPlano === 'Premium' || userPlanoId === 9 || isTrial || isAdmin;
        
        if (pagina === 'valuation_empresas') {
            document.getElementById('pagina-valuation-empresas').style.display = 'block';
            document.getElementById('val-empresas-paywall').style.display = hasAccess ? 'none' : 'block';
            document.getElementById('val-empresas-content').style.display = hasAccess ? 'flex' : 'none';
            if (hasAccess && window.ValuationFcffV1) {
                const tickerFcff = ticker || (window.acaoAtiva ? window.acaoAtiva.ticker : null);
                window.ValuationFcffV1.open(tickerFcff);
            }
        } else {
            document.getElementById('pagina-valuation-bancos').style.display = 'block';
            document.getElementById('val-bancos-paywall').style.display = hasAccess ? 'none' : 'block';
            document.getElementById('val-bancos-content').style.display = hasAccess ? 'flex' : 'none';
            if (hasAccess && window.ValuationPatrimonioV1) {
                const tickerBanco = ticker || (window.acaoAtiva ? window.acaoAtiva.ticker : null);
                window.ValuationPatrimonioV1.open(tickerBanco);
            }
        }
    } else if (pagina === 'manual') {
        // Manual do Valuation: aberto a todo usuário logado; o 2º argumento é o capítulo (null = o último lido).
        document.getElementById('pagina-manual').style.display = 'block';
        if (window.ManualValuation) window.ManualValuation.open(ticker, { voltar: (opcoes && opcoes.voltar) || null });
    } else if (pagina === 'indicadores_resumo') {
        document.getElementById('pagina-indicadores-resumo').style.display = 'block';
        carregarIndicadoresResumo();
    } else if (pagina === 'indicadores_juro_real') {
        const userPlano = localStorage.getItem('user_plano');
        const userPlanoId = parseInt(localStorage.getItem('user_plano_id'));
        const isTrial = localStorage.getItem('is_trial') === 'true';
        const isAdmin = localStorage.getItem('is_admin') === 'true';
        const hasAccess = userPlano === 'Premium' || userPlanoId === 9 || isTrial || isAdmin;

        document.getElementById('pagina-indicadores-juro-real').style.display = 'block';
        document.getElementById('indicadores-juro-real-paywall').style.display = hasAccess ? 'none' : 'block';
        document.getElementById('indicadores-juro-real-content').style.display = hasAccess ? 'block' : 'none';
        if (hasAccess) {
            carregarIndicadoresJuroReal();
        }
    } else if (pagina === 'indicadores_curva') {
        const userPlano = localStorage.getItem('user_plano');
        const userPlanoId = parseInt(localStorage.getItem('user_plano_id'));
        const isTrial = localStorage.getItem('is_trial') === 'true';
        const isAdmin = localStorage.getItem('is_admin') === 'true';
        const hasAccess = userPlano === 'Premium' || userPlanoId === 9 || isTrial || isAdmin;

        document.getElementById('pagina-indicadores-curva').style.display = 'block';
        document.getElementById('indicadores-curva-paywall').style.display = hasAccess ? 'none' : 'block';
        document.getElementById('indicadores-curva-content').style.display = hasAccess ? 'block' : 'none';
        if (hasAccess) {
            carregarIndicadoresCurva();
        }
    }

    if (pagina === 'ativo' && ticker) {
        carregarAtivo(ticker);
    }
    if (pagina === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (pagina === 'ranking') {
        setTimeout(() => {
            document.getElementById('secao-ranking').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    if (elementoClick) {
        document.querySelectorAll('.sidebar .nav-link').forEach(el => {
            el.classList.remove('active');
        });
        elementoClick.classList.add('active');
    }
}

// ====================== BUSCA ======================

function buscarTicker() {
    const input = document.getElementById('input-busca');
    const sugestoesDiv = document.getElementById('sugestoes-busca');
    const valor = input.value.trim().toUpperCase();
    
    if (valor.length >= 2) {
        // Se a primeira sugestão estiver disponível, navega para ela
        const primeiroItem = sugestoesDiv ? sugestoesDiv.querySelector('.suggestion-item') : null;
        if (primeiroItem) {
            const ticker = primeiroItem.dataset.ticker;
            if (sugestoesDiv) sugestoesDiv.style.display = 'none';
            input.value = ticker;
            navegarPara('ativo', ticker);
        } else if (valor.length >= 4) {
            // Caso contrário, tenta navegar com o valor digitado diretamente
            if (sugestoesDiv) sugestoesDiv.style.display = 'none';
            navegarPara('ativo', valor);
        }
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    if (!(await verificarLogin())) return; // Para a inicialização se não estiver logado

    const inputBusca = document.getElementById('input-busca');
    const sugestoesDiv = document.getElementById('sugestoes-busca');
    let debounceTimer = null;

    if (inputBusca && sugestoesDiv) {
        // Trata a digitação com debounce
        inputBusca.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            const query = inputBusca.value.trim();

            if (query.length < 2) {
                sugestoesDiv.innerHTML = '';
                sugestoesDiv.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(async () => {
                try {
                    const resp = await fetch(`${API_BASE}/acoes/busca?q=${encodeURIComponent(query)}`);
                    if (!resp.ok) throw new Error('Erro na busca');
                    const sugestoes = await resp.json();

                    if (sugestoes.length > 0) {
                        sugestoesDiv.innerHTML = sugestoes.map(s => `
                            <div class="suggestion-item" data-ticker="${s.ticker}">
                                <span class="suggestion-ticker">${s.ticker}</span>
                                <span class="suggestion-name">${s.nome_empresa || ''}</span>
                            </div>
                        `).join('');
                        sugestoesDiv.style.display = 'block';

                        // Adiciona clique em cada item
                        sugestoesDiv.querySelectorAll('.suggestion-item').forEach(item => {
                            item.addEventListener('click', function () {
                                const ticker = this.dataset.ticker;
                                inputBusca.value = ticker;
                                sugestoesDiv.style.display = 'none';
                                navegarPara('ativo', ticker);
                            });
                        });
                    } else {
                        sugestoesDiv.innerHTML = '';
                        sugestoesDiv.style.display = 'none';
                    }
                } catch (err) {
                    console.error('Erro ao buscar sugestões:', err);
                }
            }, 300);
        });

        // Fecha as sugestões ao clicar fora
        document.addEventListener('click', function (e) {
            if (e.target !== inputBusca && e.target !== sugestoesDiv && !sugestoesDiv.contains(e.target)) {
                sugestoesDiv.style.display = 'none';
            }
        });

        // Restaura busca imediata ao focar novamente se houver texto
        inputBusca.addEventListener('focus', function () {
            if (sugestoesDiv.children.length > 0 && inputBusca.value.trim().length >= 2) {
                sugestoesDiv.style.display = 'block';
            }
        });

        // Teclado
        inputBusca.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                buscarTicker();
            }
        });
    }

    await carregarCenarios();
    await carregarSegmentos();
    await carregarDatas();
    carregarRanking();
});

// ====================== RANKING ======================

async function mudarUniverso() {
    await carregarCenarios();
    await carregarSegmentos();
    await carregarDatas();
    carregarRanking();
}

async function mudarCenario() {
    await carregarDatas();
    carregarRanking();
}

// Controle do Dropdown Customizado de Datas
window.rankingDataSelecionada = '';

function toggleDropdownData(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('dropdown-data-menu');
    if (!menu) return;
    const isVisible = menu.style.display === 'block';
    
    fecharTodosDropdowns();
    
    if (!isVisible) {
        menu.style.display = 'block';
    }
}

function fecharTodosDropdowns() {
    const menu = document.getElementById('dropdown-data-menu');
    if (menu) menu.style.display = 'none';
}

function selecionarData(value, labelText, element) {
    window.rankingDataSelecionada = value;
    const label = document.getElementById('selected-data-label');
    if (label) label.textContent = labelText;

    const menu = document.getElementById('dropdown-data-menu');
    if (menu) {
        const items = menu.querySelectorAll('.custom-dropdown-item');
        items.forEach(item => item.classList.remove('active'));
    }
    if (element) element.classList.add('active');

    fecharTodosDropdowns();
    carregarRanking();
}

// Expõe globalmente para acesso via onclick do HTML
window.toggleDropdownData = toggleDropdownData;
window.fecharTodosDropdowns = fecharTodosDropdowns;
window.selecionarData = selecionarData;

// Fecha dropdowns ao clicar fora
document.addEventListener('click', function() {
    fecharTodosDropdowns();
});

async function carregarCenarios() {
    try {
        const selectUniv = document.getElementById('select-universo');
        const smallCaps = selectUniv ? selectUniv.value : 0;
        const resp = await fetch(`${API_BASE}/ranking/cenarios?small_caps=${smallCaps}`);
        const cenarios = await resp.json();
        
        // Força 'Dividendos_Crescentes_DGI' a ser o primeiro da lista
        const indexDGI = cenarios.indexOf('Dividendos_Crescentes_DGI');
        if (indexDGI > -1) {
            cenarios.splice(indexDGI, 1);
            cenarios.unshift('Dividendos_Crescentes_DGI');
        }

        const select = document.getElementById('select-cenario');
        if (select) {
            select.innerHTML = cenarios.map(c =>
                `<option value="${c}" ${c === 'Dividendos_Crescentes_DGI' ? 'selected' : ''}>${c.replace(/_/g, ' ')}</option>`
            ).join('');
        }
    } catch (err) {
        console.error('Erro ao carregar cenários:', err);
    }
}

async function carregarSegmentos() {
    try {
        const selectUniv = document.getElementById('select-universo');
        const smallCaps = selectUniv ? selectUniv.value : 0;
        const resp = await fetch(`${API_BASE}/ranking/segmentos?small_caps=${smallCaps}`);
        const segmentos = await resp.json();
        const select = document.getElementById('select-segmento');

        if (select) {
            const optionsHTML = ['<option value="">Todos os Segmentos</option>', '<option value="Bancos">Bancos</option>'];
            segmentos.forEach(s => {
                if (s !== 'Bancos') {
                    optionsHTML.push(`<option value="${s}">${s}</option>`);
                }
            });
            select.innerHTML = optionsHTML.join('');
        }
    } catch (err) {
        console.error('Erro ao carregar segmentos:', err);
    }
}

async function carregarDatas() {
    try {
        const cenarioSelect = document.getElementById('select-cenario');
        if (!cenarioSelect) return;
        const cenario = cenarioSelect.value;

        const selectUniv = document.getElementById('select-universo');
        const smallCaps = selectUniv ? selectUniv.value : 0;

        const resp = await fetch(`${API_BASE}/ranking/datas?cenario=${cenario}&small_caps=${smallCaps}`);
        const datas = await resp.json();
        
        const menu = document.getElementById('dropdown-data-menu');
        const label = document.getElementById('selected-data-label');
        const container = document.getElementById('dropdown-data');
        
        if (menu && label && container) {
            if (datas && datas.length > 0) {
                // Define a primeira data como padrão
                window.rankingDataSelecionada = datas[0];
                const partes = datas[0].split('-');
                const dataFormatadaPadrao = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : datas[0];
                label.textContent = dataFormatadaPadrao;

                menu.innerHTML = datas.map((d, index) => {
                    const partes = d.split('-');
                    const dataFormatada = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : d;
                    return `<div class="custom-dropdown-item ${index === 0 ? 'active' : ''}" data-value="${d}" onclick="selecionarData('${d}', '${dataFormatada}', this)">${dataFormatada}</div>`;
                }).join('');
                container.style.display = 'inline-block';
            } else {
                window.rankingDataSelecionada = '';
                label.textContent = 'Sem datas';
                menu.innerHTML = '';
                container.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Erro ao carregar datas:', err);
    }
}

async function carregarRanking() {
    const cenarioSelect = document.getElementById('select-cenario');
    if (!cenarioSelect) return;

    const cenario = cenarioSelect.value;
    const selectSeg = document.getElementById('select-segmento');
    const segmento = selectSeg ? selectSeg.value : '';
    const selectUniv = document.getElementById('select-universo');
    const smallCaps = selectUniv ? selectUniv.value : 0;
    const dataExec = window.rankingDataSelecionada || '';

    const tbody = document.getElementById('tabela-ranking');
    const btnSalvar = document.getElementById('btn-salvar-excel');
    const tableWrapper = tbody ? tbody.closest('.table-wrapper') : null;

    // Bloqueio de seleção com mouse para gratuitos (trial expirado)
    const _rPlano = localStorage.getItem('user_plano');
    const _rPlanoId = parseInt(localStorage.getItem('user_plano_id'));
    const _rTrial = localStorage.getItem('is_trial') === 'true';
    const _rAdmin = localStorage.getItem('is_admin') === 'true';
    const _rPremium = _rPlano === 'Premium' || _rPlanoId === 9 || _rAdmin;
    if (!_rPremium && !_rTrial && tableWrapper) {
        tableWrapper.style.userSelect = 'none';
        tableWrapper.style.webkitUserSelect = 'none';
        tableWrapper.style.msUserSelect = 'none';
    } else if (tableWrapper) {
        tableWrapper.style.userSelect = '';
        tableWrapper.style.webkitUserSelect = '';
        tableWrapper.style.msUserSelect = '';
    }
    
    if (btnSalvar) {
        btnSalvar.disabled = false;
        btnSalvar.style.opacity = '1';
        btnSalvar.style.cursor = 'pointer';
        btnSalvar.title = 'Salvar dados atuais em planilha';
    }
    
    if (tbody) tbody.innerHTML = '<tr><td colspan="25" class="loading">Carregando ranking</td></tr>';

    try {
        let url = `${API_BASE}/ranking?cenario=${cenario}&limit=380&small_caps=${smallCaps}`;
        if (segmento) url += `&segmento=${segmento}`;
        if (dataExec) url += `&data=${dataExec}`;
        const resp = await fetch(url);
        const dados = await resp.json();

        window.rankingAtualData = dados;
        
        // Reseta o estado de ordenação ao carregar novos filtros
        window.rankingSortCol = null;
        window.rankingSortDir = 'asc';

        renderizarDestaques(dados.slice(0, 4));
        renderizarTabelaRanking();
    } catch (err) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="color:var(--accent-red)">Erro ao carregar ranking</td></tr>';
        console.error(err);
    }
}

// P-ALERTA-01: selo informativo de empresa sem geração de caixa operacional (o backend calcula; aqui só apresenta).
const ALERTA_CAIXA_COLUNAS = ['alerta_caixa', 'alerta_caixa_texto'];

function alertaCaixaSelo(acao) {
    const nivel = acao && acao.alerta_caixa ? String(acao.alerta_caixa) : '';
    if (!nivel) return '';
    const classe = nivel === 'LTM' ? 'alerta-caixa-ltm' : 'alerta-caixa-grave';
    const texto = String(acao.alerta_caixa_texto || 'Empresa sem geração de caixa operacional.')
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return ` <span class="alerta-caixa ${classe}" title="${texto}" aria-label="${texto}">⚠</span>`;
}

// 11/10/2026: legenda abaixo dos filtros (no lugar do filtro "Ocultar ⚠ caixa"), só quando a lista tem empresa com alerta.
function legendaAlertaCaixa(dados) {
    const n = (dados || []).filter(acao => acao && acao.alerta_caixa).length;
    if (!n) return '';
    const empresas = n === 1 ? '1 empresa desta lista' : `${n} empresas desta lista`;
    return `<span class="alerta-caixa alerta-caixa-grave">⚠</span> ${empresas} com alerta de geração de caixa operacional `
        + '(EBIT ajustado ≤ 0) — passe o mouse no ⚠ ao lado do ticker para ver o motivo.';
}

function renderizarTabelaRanking() {
    const thead = document.getElementById('tabela-ranking-head');
    const tbody = document.getElementById('tabela-ranking');
    const dados = window.rankingAtualData;
    const legenda = document.getElementById('ranking-legenda-alerta');
    if (legenda) {
        legenda.innerHTML = legendaAlertaCaixa(dados);
        legenda.style.display = legenda.innerHTML ? 'block' : 'none';
    }

    if (!dados || dados.length === 0) {
        if (thead) thead.innerHTML = '';
        if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Nenhum dado encontrado</td></tr>';
        return;
    }

    const colunas = Object.keys(dados[0]).filter(k => k !== 'ranking_no_segmento' && k !== 'optimization_goal' && !ALERTA_CAIXA_COLUNAS.includes(k));

    let trHead = '<tr>';
    colunas.forEach(col => {
        let classList = [];
        if (typeof dados[0][col] === 'number') classList.push('right');
        if (col === 'ranking') classList.push('rank-cell', 'sticky-col');
        if (col === 'ticker') classList.push('ticker-cell', 'sticky-col');
        if (col === 'preco') classList.push('preco-cell', 'sticky-col');

        let classAttr = classList.length > 0 ? `class="${classList.join(' ')}"` : '';
        
        // Indicador de ordenação
        let indicador = '';
        if (window.rankingSortCol === col) {
            indicador = window.rankingSortDir === 'asc' 
                ? ' <span class="sort-arrow" style="color: var(--accent-blue);">▲</span>' 
                : ' <span class="sort-arrow" style="color: var(--accent-blue);">▼</span>';
        } else {
            indicador = ' <span class="sort-arrow" style="opacity: 0.25;">↕</span>';
        }

        trHead += `<th ${classAttr} onclick="window.ordenarRankingPor('${col}')">${col.toUpperCase().replace(/_/g, ' ')}${indicador}</th>`;
    });
    trHead += '</tr>';
    if (thead) thead.innerHTML = trHead;

    if (tbody) {
        tbody.innerHTML = dados.map(acao => {
            let trBody = `<tr onclick="navegarPara('ativo', '${acao.ticker}')">`;
            colunas.forEach(col => {
                let rawVal = acao[col];
                let displayVal = rawVal;
                let addClass = '';

                if (rawVal === null || rawVal === undefined) {
                    displayVal = '—';
                } else if (typeof rawVal === 'number') {
                    addClass = 'right';
                    if (['ativo_total', 'ev_ebit', 'capex', 'div_liq', 'fcf', 'fci', 'fcl', 'fco', 'imobilizado', 'lucro_liquido', 'patrimonio_liquido', 'enterprise_value', 'valor_mercado'].includes(col)) {
                        displayVal = (Math.abs(rawVal) >= 1e6) ? fmtBilhao(rawVal) : fmt(rawVal);
                        if (displayVal.includes('Bi') || displayVal.includes('Mi')) displayVal = 'R$ ' + displayVal;
                    } else if (['preco', 'lpa', 'vpa', 'dpa'].includes(col)) {
                        displayVal = 'R$ ' + fmt(rawVal);
                    } else if (col.includes('%') || col.includes('cagr') || col.includes('margem') || col.includes('taxa') || col.includes('roe') || col.includes('roa') || col.includes('dy') || col.includes('payout') || col.includes('captacoes')) {
                        displayVal = fmt(rawVal) + '%';
                        if (rawVal > 15 && (col.includes('roe') || col.includes('margem'))) addClass += ' positive';
                        if (rawVal < 0) addClass += ' negative';
                    } else if (col.includes('eficiencia')) {
                        displayVal = fmt(rawVal) + '%';   // 11/10/2026: a capitalacionario guarda em pontos percentuais (34,07), não fração
                        if (rawVal < 0) addClass += ' negative';
                    } else {
                        displayVal = fmt(rawVal);
                    }
                }

                if (col === 'ranking') {
                    trBody += `<td class="rank-cell sticky-col">${rawVal}</td>`;
                } else if (col === 'ticker') {
                    trBody += `<td class="ticker-cell sticky-col">${rawVal}${alertaCaixaSelo(acao)}</td>`;
                } else if (col === 'preco') {
                    trBody += `<td class="preco-cell sticky-col ${addClass}">${displayVal}</td>`;
                } else if (col === 'nome_empresa' || col === 'segmento') {
                    trBody += `<td>${truncar(rawVal, col === 'nome_empresa' ? 25 : 18)}</td>`;
                } else {
                    trBody += `<td class="${addClass}">${displayVal}</td>`;
                }
            });
            trBody += '</tr>';
            return trBody;
        }).join('');
    }
}

window.ordenarRankingPor = function (col) {
    if (window.rankingSortCol === col) {
        window.rankingSortDir = window.rankingSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        window.rankingSortCol = col;
        window.rankingSortDir = 'asc';
    }

    if (window.rankingAtualData && window.rankingAtualData.length > 0) {
        window.rankingAtualData.sort((a, b) => {
            let valA = a[col];
            let valB = b[col];

            // Nulos/undefined sempre no fim em ambos os tipos de ordenação
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;

            let result = 0;
            if (typeof valA === 'string' && typeof valB === 'string') {
                result = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' });
            } else {
                if (valA < valB) result = -1;
                else if (valA > valB) result = 1;
            }

            return window.rankingSortDir === 'asc' ? result : -result;
        });
    }

    renderizarTabelaRanking();
};

function renderizarDestaques(top) {
    const container = document.getElementById('destaques');
    if (!container) return;
    const labels = ['🥇 Melhor Score', '🥈 2º Lugar', '🥉 3º Lugar', '4º Lugar'];
    container.innerHTML = top.map((a, i) => `
        <div class="highlight-card" onclick="navegarPara('ativo', '${a.ticker}')" style="cursor:pointer">
            <div class="label">${labels[i] || '#' + a.ranking}</div>
            <div class="value ticker-cell">${a.ticker}</div>
            <div class="sub">${truncar(a.nome_empresa, 20)} · Score ${fmt(a.score_final)}</div>
        </div>
    `).join('');
}

// ====================== DETECÇÃO AÇÃO / FII ======================

window.memCache = {};

async function carregarAtivo(ticker) {
    // 10 anos saiu do seletor (o histórico começa em 03/2020); quem estava nele volta para 7
    if (!window.periodoAnos) window.periodoAnos = 5;
    if (window.periodoAnos > 7) window.periodoAnos = 7;
    const anos = window.periodoAnos;
    const cacheKey = `${ticker}_${anos}`;

    const container = document.getElementById('conteudo-ativo');

    if (window.memCache[cacheKey]) {
        await carregarAcaoRender(ticker, container, window.memCache[cacheKey]);
        return;
    }

    container.innerHTML = '<div class="loading">Carregando dados de ' + ticker + '</div>';

    try {
        // Tenta buscar dados fundamentalistas e historico de cagr (Ação)
        const [respAcao, respCagr] = await Promise.all([
            fetch(`${API_BASE}/acoes/${ticker}?anos=${anos}`),
            fetch(`${API_BASE}/acoes/${ticker}/historico_cagr?anos=${anos}`)
        ]);

        if (respAcao.ok) {
            const dadosAcao = await respAcao.json();
            if (respCagr.ok) {
                dadosAcao.historicoCagr = await respCagr.json();
            }
            window.memCache[cacheKey] = dadosAcao;
            await carregarAcaoRender(ticker, container, dadosAcao);
        } else {
            await carregarFII(ticker, container);
        }
    } catch (err) {
        container.innerHTML = '<div style="color:var(--accent-red);text-align:center;padding:40px">Erro de conexão ao servidor.</div>';
        console.error(err);
    }
}

window.mudarPeriodoAnalise = function (ticker, valor) {
    window.periodoAnos = parseInt(valor);
    carregarAtivo(ticker);
};

// ====================== FICHA FII ======================

async function carregarFII(ticker, container) {
    try {
        const resp = await fetch(`${API_BASE}/cotacoes/${ticker}?dias=252`);
        if (!resp.ok) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 0">
                    <h2 style="margin-bottom:12px">FII/ETF "${ticker}" não encontrado</h2>
                    <p style="color:var(--text-secondary)">Verifique se o código está correto.</p>
                </div>`;
            return;
        }

        const dados = await resp.json();
        if (dados.length < 5) {
            container.innerHTML = '<div style="text-align:center;padding:60px 0"><h2>Dados insuficientes para ' + ticker + '</h2></div>';
            return;
        }

        // Busca metadados da classe do ativo para rotulagem dinâmica (FII vs ETF e segmento)
        let classeInfo = {
            listagem: 'FII',
            segmento: 'Fundo de Investimento Imobiliário',
            nomeres: ticker
        };
        try {
            const respClasse = await fetch(`${API_BASE}/cotacoes/${ticker}/classe`);
            if (respClasse.ok) {
                classeInfo = await respClasse.json();
            }
        } catch (e) {
            console.error("Erro ao obter metadados da classe do ativo:", e);
        }

        const ultimo = dados[dados.length - 1];
        const primeiro = dados[0];

        const varPeriodo = ultimo.var_acumulada || 0;
        const precoAtual = ultimo.preco;
        const varDia = ultimo.var || 0;
        const ifrAtual = ultimo.preco_ifr;
        const hurstAtual = ultimo.preco_hurst;
        const vdMedia = ultimo.vd_media;
        const liqMedia = ultimo.liquidez_media;
        const menorPreco = Math.min(...dados.map(d => d.menor_preco).filter(v => v != null));
        const maiorPreco = Math.max(...dados.map(d => d.maior_preco).filter(v => v != null));

        let ifrLabel = 'Neutro';
        if (ifrAtual >= 70) ifrLabel = 'Sobrecompra ⚠️';
        else if (ifrAtual <= 30) ifrLabel = 'Sobrevenda 🟢';

        let hurstLabel = '—';
        if (hurstAtual != null) {
            if (hurstAtual > 0.55) hurstLabel = 'Tendência 📈';
            else if (hurstAtual < 0.45) hurstLabel = 'Reversão 🔄';
            else hurstLabel = 'Aleatório ⚖️';
        }

        const diasUteisReal = ultimo.dias_uteis || dados.length;
        const tituloResumo = diasUteisReal < 252 ? `Resumo ${diasUteisReal} dias úteis` : `Resumo 252 dias`;

        container.innerHTML = `
            <div class="ativo-header">
                <div class="ativo-info">
                    <h2>${ticker}</h2>
                    <div class="empresa">${classeInfo.nomeres || classeInfo.segmento}</div>
                    <span class="segmento-tag" style="background:rgba(6,182,212,0.15);color:#22d3ee;margin-right:6px;">${classeInfo.listagem}</span>
                    <span class="segmento-tag" style="background:rgba(255,255,255,0.05);color:var(--text-secondary);">${classeInfo.segmento}</span>
                </div>
                <div class="ativo-preco">
                    <div class="preco" id="preco-atual">R$ ${fmt(precoAtual)}</div>
                    <div id="badge-variacao" class="valmercado ${varDia >= 0 ? 'positive' : 'negative'}" style="font-weight: 600; font-size: 14px; padding: 4px 8px; border-radius: 6px; background: var(--bg-card); border: 1px solid var(--border-glass); color: var(--text-muted); display: inline-block;">
                        Var. dia: ${varDia >= 0 ? '▲' : '▼'} ${varDia >= 0 ? '+' : ''}${fmt(varDia)}%
                    </div>
                </div>
            </div>

            <div class="metricas-grid">
                <div class="metrica-group">
                    <h3>📊 ${tituloResumo}</h3>
                    ${metrica('Preço Atual', 'R$ ' + fmt(precoAtual))}
                    ${metrica('Menor Preço', 'R$ ' + fmt(menorPreco))}
                    ${metrica('Maior Preço', 'R$ ' + fmt(maiorPreco))}
                    ${metrica('Retorno Período', (varPeriodo >= 0 ? '+' : '') + fmt(varPeriodo) + '%', varPeriodo > 0)}
                </div>

                <div class="metrica-group">
                    <h3>🔬 Indicadores Técnicos</h3>
                    ${metrica('IFR (14)', fmt(ifrAtual))}
                    ${metrica('Sinal IFR', ifrLabel)}
                    ${metrica('Hurst', hurstAtual != null ? fmt(hurstAtual) : '—')}
                    ${metrica('Sinal Hurst', hurstLabel)}
                </div>

                <div class="metrica-group">
                    <h3>📉 Volatilidade</h3>
                    ${metrica('VD Média', fmt(vdMedia) + '%')}
                    ${metrica('Desvio Preço', 'R$ ' + fmt(ultimo.preco_sd))}
                    ${metrica('CV Preço', fmt(ultimo.preco_cv) + '%')}
                </div>

                <div class="metrica-group">
                    <h3>💧 Liquidez</h3>
                    ${metrica('Liquidez Média', fmtMilhao(liqMedia))}
                    ${metrica('IFR Liquidez', fmt(ultimo.liquidez_ifr))}
                    ${metrica('Volume Último', 'R$ ' + fmtMilhao(ultimo.voltot))}
                </div>
            </div>

            <div style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px 0">
                Período: ${primeiro.data} a ${ultimo.data} · ${ultimo.dias_uteis} dias úteis · Dados B3
            </div>
        `;

        carregarGraficos(ticker);

        // Função para atualizar preço em tempo real
        function atualizarPrecoRealtimeFII() {
            fetch(`${API_BASE}/cotacoes/${ticker}/realtime`)
                .then(res => { if (res.ok) return res.json(); throw new Error(); })
                .then(dadosRt => {
                    const preco = dadosRt.preco;
                    const varPercent = dadosRt.taxa;
                    const varRs = dadosRt.var_rs;
                    
                    const badge = document.getElementById('badge-variacao');
                    if (badge) {
                        badge.className = `valmercado ${varPercent >= 0 ? 'positive' : 'negative'}`;
                        badge.style.color = '';
                        badge.innerHTML = `Var. dia: ${varPercent >= 0 ? '▲' : '▼'} R$ ${fmt(Math.abs(varRs))} (${varPercent >= 0 ? '+' : ''}${fmt(varPercent)}%)`;
                    }
                    const precoEl = document.getElementById('preco-atual');
                    if (precoEl && preco) {
                        precoEl.innerHTML = `R$ ${fmt(preco)}`;
                        precoEl.title = `Atualizado em: ${dadosRt.atualizado_em} (delay 15m)`;
                        if (window.acaoAtiva) window.acaoAtiva.preco = preco;
                    }
                }).catch(() => {
                    console.log("Falha ao buscar FII realtime");
                });
        }
        
        atualizarPrecoRealtimeFII();
        if (window.intervaloRealtime) clearInterval(window.intervaloRealtime);
        window.intervaloRealtime = setInterval(atualizarPrecoRealtimeFII, 600000);

    } catch (err) {
        container.innerHTML = '<div style="color:var(--accent-red);text-align:center;padding:40px">Erro ao carregar dados do FII.</div>';
        console.error(err);
    }
}

// ====================== FICHA AÇÃO ======================

async function carregarAcaoRender(ticker, container, a) {
    try {
        const historicoAntigo = (window.acaoAtiva && window.acaoAtiva.ticker === a.ticker) ? window.acaoAtiva.cacheHistorico : null;
        window.acaoAtiva = a;
        if (historicoAntigo) {
            window.acaoAtiva.cacheHistorico = historicoAntigo;
            if (historicoAntigo['ANUAL']) window.acaoAtiva.historico = historicoAntigo['ANUAL'];
        }

        const ehBanco = a.segmento && a.segmento.toLowerCase().includes('banco');

        let porteTag = '';
        if (a.valor_mercado) {
            if (a.valor_mercado >= 15000000000) {
                porteTag = 'Blue Chip';
            } else if (a.valor_mercado < 1500000000) {
                porteTag = 'Small Cap';
            } else {
                porteTag = 'Mid Cap';
            }
        }

        container.innerHTML = `
            <div class="ativo-header">
                <div class="ativo-info">
                    <h2>${a.ticker} <span class="tag-tipo">${a.tipo}</span></h2>
                    <div class="empresa-nome">${a.nome_empresa}</div>
                    <span class="segmento-tag" style="margin-right: 6px;">${a.segmento || 'N/D'}</span>
                    ${porteTag ? `<span class="segmento-tag">${porteTag}</span>` : ''}
                    <div style="color:var(--text-secondary); font-size:14px; margin-top:8px;">
                        CNPJ: ${a.cnpj || 'N/D'} · Balanço: ${a.dt_fin_exerc || 'N/D'} · Pregão: ${a.datapregao || 'N/D'}
                    </div>
                </div>
                <div class="ativo-preco" style="display: flex; flex-direction: column; align-items: flex-end;">
                    <div style="display: flex; align-items: baseline; gap: 12px; margin-bottom: 2px;">
                        <span id="badge-variacao" style="font-weight: 600; font-size: 15px; background: var(--bg-card); padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-glass); color: var(--text-muted);">
                            ⏳ ...
                        </span>
                        <div id="preco-atual" class="preco" style="margin: 0;">R$ ${fmt(a.preco)}</div>
                    </div>
                    <div class="valmercado"${a.acoes_tesouraria ? ' title="Cotação × total de ações emitidas (com a tesouraria), como nas demais ferramentas. Pelas ações em circulação: R$ ' + fmtBilhao(a.valor_mercado * a.acoes_circulacao / a.acoes_total) + '."' : ''}>Valor Mercado: R$ ${fmtBilhao(a.valor_mercado)}</div>
                    <div class="valmercado">Enterprise Value: R$ ${fmtBilhao(a.enterprise_value)}</div>
                    <div class="valmercado">Volume Financeiro: R$ ${fmtMilhao(a.volume_financeiro)}</div>
                    <div class="valmercado">Total de Ações: ${fmtBilhao(a.acoes_total)}</div>
                </div>
            </div>

            ${a.analise_ia_texto === '_LOCKED_PREMIUM_' ? `
            <div class="ia-analysis-card" style="background: var(--bg-card); padding: 30px; border-radius: 8px; margin-bottom: 24px; border: 1px solid var(--border-glass); text-align: center;">
                <div style="font-size: 40px; margin-bottom: 12px;">🔒</div>
                <h3 style="margin-top: 0; margin-bottom: 8px; color: var(--text-primary);">Análise Descritiva IA (RAG)</h3>
                <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 16px;">O acesso aos resumos de relatórios oficiais CVM (FRE/IPE) lidos pela Inteligência Artificial é exclusivo Premium.</p>
                <button style="background: var(--accent-yellow); color: #000; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer;">Desbloquear Recurso</button>
            </div>
            ` : (a.analise_ia_texto ? `
            <div class="ia-analysis-card" id="ia-analysis-card" style="background: var(--bg-card); padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid var(--accent-blue);">
                <h3 style="margin-top: 0; margin-bottom: 12px; color: var(--text-primary); display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span style="font-size: 1.2em;">🤖</span> Análise Qualitativa IA (FRE/IPE da CVM)
                    ${(a.raciocinio_ia && a.raciocinio_ia !== '_LOCKED_PREMIUM_') ? `
                    <button id="btn-raciocinio-ia" onclick="abrirModalRaciocinio('${a.ticker}')" class="btn-comparador" style="font-size: 12px; padding: 4px 10px;">
                        💡 Raciocínio da IA
                    </button>
                    ` : ''}
                    ${(a.datas_analise_ia && a.datas_analise_ia.length > 0) ? `
                    <select id="select-data-analise-ia" onchange="mudarDataAnaliseIA('${a.ticker}', this.value)" style="font-size: 12px; padding: 4px 28px 4px 10px; cursor: pointer; width: auto; border-radius: 6px; border: 1px solid var(--accent-blue); background: var(--accent-blue-soft); color: var(--accent-blue); font-weight: bold; outline: none; appearance: none; -webkit-appearance: none; background-image: url(&quot;data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232563eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e&quot;); background-repeat: no-repeat; background-position: right 8px center; background-size: 12px;">
                        ${a.datas_analise_ia.map(function(d, i) { return '<option value="' + d + '"' + (i === 0 ? ' selected' : '') + '>' + formatarDataBR(d) + '</option>'; }).join('')}
                    </select>
                    ` : ''}
                </h3>
                <div id="ia-analysis-body" style="color: var(--text-secondary); white-space: pre-line; line-height: 1.6; font-size: 14px;">
                    ${a.analise_ia_texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/### (.*?)\n/g, '<h4>$1</h4>').replace(/- (.*?)\n/g, '• $1\n')}
                </div>
                <div id="ia-analysis-footer" style="margin-top: 12px; font-size: 11px; color: var(--text-muted); text-align: right;">
                    Atualizado semanalmente. Fonte: RAG IA / Documentos B3 e CVM
                </div>
            </div>
            ` : `
            <div id="ia-analysis-ausente" style="margin-bottom: 24px; font-size: 12px; color: var(--text-muted);">
                Sem análise qualitativa: ela é feita só para as ações do ranking, que exige liquidez e porte mínimos.
            </div>
            `)}

            <div id="valuation-container" style="margin-bottom:24px;"></div>

            <div class="metricas-grid">
                <div class="metrica-group">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid var(--border-glass);">
                        <h3 style="margin:0; border-bottom:none; padding-bottom:0; font-size:13px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">📉 Valuation</h3>
                        <button onclick="abrirModalComparador()" class="btn-comparador" style="padding:4px 8px; font-size:11px; font-weight:bold;">
                            Comparar Indicadores 📊
                        </button>
                    </div>
                    ${metrica('P/L', fmt(a.p_l), false, 'p_l', false, lucroTotalHint('P/L', '', a.p_l_ref != null ? fmt(a.p_l_ref) : null))}
                    ${metrica('P/VPA', fmt(a.p_vpa), false, 'p_vpa')}
                    ${metrica('P/FCL', fmt(a.p_fcl), false, 'p_fcl')}
                    ${metrica('FCL Yield', fmt(a.fcl_yield) + '%', false, 'fcl_yield', false, 'Fórmula: FCL / Valor de Mercado<br>' + (a.fcl_yield != null && a.fcl_yield !== 0 ? 'Um Yield de ' + fmt(a.fcl_yield) + '% significa que para cada R$ 100 do valor da empresa, ela gera R$ ' + fmt(a.fcl_yield) + ' de caixa livre (dinheiro limpo) no ano.' : 'Valor não informado.'))}
                    ${metrica('EV/EBIT', fmt(a.ev_ebit), false, 'ev_ebit')}
                    ${metrica('EV/EBITDA', fmt(a.ev_ebitda), false, 'ev_ebitda')}
                    ${metrica('PEG Ratio', fmt(a.peg_ratio), false, 'peg_ratio', true, 'Fórmula: P/L / LPA CAGR<br>' + (a.peg_ratio != null && a.peg_ratio !== 0 ? 'O PEG de ' + fmt(a.peg_ratio) + (a.peg_ratio < 0 ? ' indica um sinal de alerta, pois a empresa possui prejuízo atual ou lucros históricos decrescentes (o que distorce o indicador).' : (a.peg_ratio <= 1.0 ? ' sugere que a ação está atrativa em relação ao seu crescimento (valores abaixo de 1,00 indicam potencial subavaliação).' : ' sugere que o mercado está pagando caro pelo crescimento atual (valores acima de 1,00 indicam que a ação pode estar sobreavaliada).')) : 'Valor não informado.'))}
                    ${metrica('LPA', 'R$ ' + fmt(a.lpa), false, 'lpa', false, [lucroTotalHint('LPA', '÷ total de ações', a.lpa_ref != null ? 'R$ ' + fmt(a.lpa_ref) : null), acoesTotaisHint(a)].filter(Boolean).join('<br>') || null)}
                    ${metrica('VPA', 'R$ ' + fmt(a.vpa), false, 'vpa')}
                    ${metrica('Rendimento dos Lucros', fmt(a.earnings_yield) + '%', false, 'earnings_yield', false, 'Fórmula: LPA / Preço * 100<br>' + (a.earnings_yield != null && a.earnings_yield !== 0 ? 'Um Rendimento dos Lucros de ' + fmt(a.earnings_yield) + '% significa que para cada R$ 100 investidos na ação ao preço atual, a empresa gera R$ ' + fmt(a.earnings_yield) + ' de retorno sob forma de lucro líquido no ano. Útil para comparar diretamente com a rentabilidade da taxa Selic/CDI.' : 'Valor não informado.'))}
                </div>

                <div class="metrica-group">
                    <h3>📈 Rentabilidade</h3>
                    ${metrica('ROE', fmt(a.roe) + '%', a.roe > 15, 'roe', false, lucroTotalHint('ROE', '÷ PL dos controladores', a.roe_ref != null ? fmt(a.roe_ref) + '% (lucro e PL com os minoritários)' : null))}
                    ${metrica('ROE Média', fmt(a.roe_media) + '%', false, 'roe_media', true)}
                    ${metrica('ROA', fmt(a.roa) + '%', false, 'roa')}
                    ${metrica('Margem', fmt(a.margem) + '%', false, 'margem', false, 'Fórmula: Margem = Lucro Líquido / Receita Líquida')}
                    ${metrica('Margem Média', fmt(a.margem_media) + '%', false, 'margem_media', true)}
                    ${metrica('ROIC', fmt(a.roic) + '%', false, 'roic', false, 'Fórmula: ROIC = NOPAT / Capital Investido<br>Capital Investido = Patrimônio Líquido + Dívida Líquida (com as aplicações financeiras)<br>NOPAT = EBIT × (1 - alíquota efetiva da empresa' + (aliquotaEfetivaTxt(a) ? ', ' + aliquotaEfetivaTxt(a) : '') + ')<br>' + (a.roic != null && a.roic !== 0 ? 'O ROIC de ' + fmt(a.roic) + '% ' + (a.roic < 0 ? 'indica destruição de valor, com prejuízo operacional no período.' : (a.roic >= 10.0 ? 'sugere excelente rentabilidade e eficiência na alocação de capital (geração de valor).' : 'sugere rentabilidade positiva, porém moderada na alocação de capital.')) : 'Valor não informado.'))}
                    ${metrica('ROIC Média', fmt(a.roic_media) + '%', false, 'roic_media', true)}
                    ${metrica('ROCE', fmt(a.roce) + '%', false, 'roce', false, 'Fórmula: ROCE = EBIT / Capital Empregado<br>Capital Empregado = Ativo Total - Passivo Circulante<br>' + (a.roce != null && a.roce !== 0 ? 'O ROCE de ' + fmt(a.roce) + '% ' + (a.roce < 0 ? 'indica prejuízo operacional no período, com retorno negativo sobre o capital empregado.' : (a.roce >= 10.0 ? 'sugere excelente eficiência no uso do capital de longo prazo empregado na operação.' : 'indica retorno positivo, porém modesto sobre o capital empregado de longo prazo.')) : 'Valor não informado.'))}
                    ${metrica('ROCE Média', fmt(a.roce_media) + '%', false, 'roce_media', true)}
                    ${metrica('Margem EBITDA', fmt(a.margem_ebitda) + '%', false, 'margem_ebitda', false, 'Fórmula: EBITDA / Receita Líquida * 100<br>' + (a.margem_ebitda != null && a.margem_ebitda !== 0 ? 'Uma Margem EBITDA de ' + fmt(a.margem_ebitda) + '% significa que para cada R$ 100 em vendas, a empresa gerou R$ ' + fmt(a.margem_ebitda) + ' de lucro antes de juros, impostos, depreciação e amortização.' : 'Valor não informado.'))}
                    ${metrica('Margem EBITDA Média', fmt(a.margem_ebitda_media) + '%', false, 'margem_ebitda_media', true, 'Fórmula: Média da Margem EBITDA = Soma(Margem EBITDA) / Anos<br>' + (a.margem_ebitda_media != null && a.margem_ebitda_media !== 0 ? 'Uma Margem EBITDA Média de ' + fmt(a.margem_ebitda_media) + '% significa que, em média, na janela selecionada, para cada R$ 100 em vendas a empresa gerou R$ ' + fmt(a.margem_ebitda_media) + ' de caixa operacional bruto (EBITDA).' : 'Valor não informado.'))}
                </div>

                <div class="metrica-group">
                    <h3>💰 Dividendos Pagos</h3>
                    ${metrica('Dividend Yield', fmt(a.dy) + '%', a.dy >= 6, 'dy')}
                    ${metrica('DY Média', fmt(a.dy_media) + '%', false, 'dy_media', true)}
                    ${metrica('DPA', 'R$ ' + fmt(a.dpa), false, 'dpa', false, 'Dividendos Pagos por Ação')}
                    ${metrica('DPA Médio', 'R$ ' + fmt(a.dpa_media || a.dpa || 0), false, 'dpa_media', true, 'Dividendos Médios Pagos por Ação (modelo Bazin: DY Médio × Preço; nas units, por unit)')}
                    ${metrica('Payout', fmt(a.payout) + '%', false, 'payout', false, 'Fórmula: Payout = Dividendos / Lucro Líquido<br>' + (a.payout != null && a.payout !== 0 ? 'Um Payout de ' + fmt(a.payout) + '% significa que para cada R$ 100 de lucro líquido contábil gerado, a empresa distribuiu R$ ' + fmt(a.payout) + ' em proventos no ano.' : 'Valor não informado.'))}
                    ${metrica('Payout Médio', fmt(a.payout_media) + '%', false, 'payout_media', true, 'Fórmula: Payout Médio = Soma(Payout) / Anos<br>' + (a.payout_media != null && a.payout_media !== 0 ? 'Um Payout Médio de ' + fmt(a.payout_media) + '% significa que, em média, na janela de anos selecionada, a empresa distribuiu R$ ' + fmt(a.payout_media) + ' para cada R$ 100 de lucro líquido contábil gerado.' : 'Valor não informado.'))}
                    ${metrica('Payout de FCL', fmt(a.payout_fcl) + '%', false, 'payout_fcl', false, 'Fórmula: Payout de FCL = (Dividendos / Fluxo de Caixa Livre) * 100<br>' + (a.payout_fcl != null && a.payout_fcl !== 0 ? 'Um Payout de FCL de ' + fmt(a.payout_fcl) + '% significa que para cada R$ 100 de caixa livre (dinheiro limpo) gerado, a empresa distribuiu R$ ' + fmt(a.payout_fcl) + ' em proventos no ano. ' + (a.payout_fcl > 100 ? 'Como é maior que 100%, a empresa distribuiu mais do que gerou de caixa real (consumiu reservas ou contraiu dívidas).' : 'Como é menor ou igual a 100%, a distribuição cabe no caixa livre gerado.') : 'Valor não informado ou FCL negativo (queima de caixa).'))}
                    ${metrica('Payout de FCL Médio', fmt(a.payout_fcl_media) + '%', false, 'payout_fcl_media', true, 'Fórmula: Média do Payout de FCL = Soma(Payout de FCL) / Anos<br>' + (a.payout_fcl_media != null && a.payout_fcl_media !== 0 ? 'Um Payout de FCL Médio de ' + fmt(a.payout_fcl_media) + '% significa que, em média, na janela de anos selecionada, a empresa distribuiu R$ ' + fmt(a.payout_fcl_media) + ' para cada R$ 100 de caixa livre gerado.' : 'Valor não informado.'))}
                    ${metrica('Total Pago no Ano', 'R$ ' + fmtBilhao(a.dividendos), false, 'dividendos')}
                    ${metrica('Dividendo Médio Pago', 'R$ ' + fmtBilhao(a.dividen_media), false, 'dividen_media', true)}
                </div>

                <div class="metrica-group">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                        <h3 style="margin: 0; white-space: nowrap; font-size: 14px;">🚀 CAGR</h3>
                        <select id="anosSelect" onchange="mudarPeriodoAnalise('${a.ticker}', this.value)" style="border-radius: 6px; cursor: pointer; height: 32px; width: auto; font-family: inherit;">
                            <option value="3" ${window.periodoAnos === 3 ? 'selected' : ''}>3 Anos</option>
                            <option value="4" ${window.periodoAnos === 4 ? 'selected' : ''}>4 Anos</option>
                            <option value="5" ${(!window.periodoAnos || window.periodoAnos === 5) ? 'selected' : ''}>5 Anos</option>
                            <option value="6" ${window.periodoAnos === 6 ? 'selected' : ''}>6 Anos</option>
                            <option value="7" ${window.periodoAnos === 7 ? 'selected' : ''}>7 Anos</option>
                        </select>
                    </div>
                    ${metrica('Lucro CAGR', fmt(a.lucro_liq_cagr) + '%', a.lucro_liq_cagr > 5, 'lucro_liq_cagr', true, cagrPeriodoHint(a, 'lucro_liq_cagr'))}
                    ${metrica('Receita CAGR', fmt(a.rec_liq_cagr) + '%', a.rec_liq_cagr > 5, 'rec_liq_cagr', true, cagrPeriodoHint(a, 'rec_liq_cagr'))}
                    ${metrica('LPA CAGR', fmt(a.lpa_cagr) + '%', a.lpa_cagr > 5, 'lpa_cagr', true, cagrPeriodoHint(a, 'lpa_cagr'))}
                    ${metrica('VPA CAGR', fmt(a.vpa_cagr) + '%', false, 'vpa_cagr', true, cagrPeriodoHint(a, 'vpa_cagr'))}
                    ${metrica('DPA CAGR', fmt(a.dpa_cagr) + '%', false, 'dpa_cagr', true, cagrPeriodoHint(a, 'dpa_cagr'))}
                    ${metrica('PL CAGR', fmt(a.pat_liq_cagr) + '%', false, 'pat_liq_cagr', true, cagrPeriodoHint(a, 'pat_liq_cagr'))}
                    ${metrica('FCL CAGR', fmt(a.fcl_cagr) + '%', false, 'fcl_cagr', true, cagrPeriodoHint(a, 'fcl_cagr'))}
                    ${metrica('EBIT CAGR', fmt(a.ebit_cagr) + '%', false, 'ebit_cagr', true, cagrPeriodoHint(a, 'ebit_cagr'))}
                    ${metrica('EBITDA CAGR', fmt(a.ebitda_cagr) + '%', false, 'ebitda_cagr', true, cagrPeriodoHint(a, 'ebitda_cagr'))}
                    ${metrica('Dív. Líquida CAGR', fmt(a.div_liq_cagr) + '%', false, 'div_liq_cagr', true, 'Fórmula: Crescimento composto da Dívida Líquida<br>' + (a.div_liq_cagr != null && a.div_liq_cagr !== 0 ? 'Um CAGR de ' + fmt(a.div_liq_cagr) + '% significa que a dívida líquida da empresa ' + (a.div_liq_cagr >= 0 ? 'cresceu' : 'diminuiu') + ' em média ' + fmt(Math.abs(a.div_liq_cagr)) + '% ao ano na janela de anos selecionada.' : 'Valor não informado.') + (cagrPeriodoHint(a, 'div_liq_cagr') ? '<br>' + cagrPeriodoHint(a, 'div_liq_cagr') : ''))}
                </div>

                <div class="metrica-group">
                    <h3>⚖️ Endividamento</h3>
                    ${metrica('Dív.Líq/EBIT', fmt(a.div_liq_ebit), false, 'div_liq_ebit')}
                    ${metrica('Dív.Líq/EBITDA', fmt(a.div_liq_ebitda), false, 'div_liq_ebitda')}
                    ${metrica('Dív.Líq/PL', fmt(a.div_liq_pl), false, 'div_liq_pl')}
                    ${metrica('Dív. Bruta/PL', fmt(a.div_bruta_pl), false, 'div_bruta_pl', false, 'Fórmula: Dívida Bruta / Patrimônio Líquido<br>' + (a.div_bruta_pl != null && a.div_bruta_pl !== 0 ? 'Um índice de ' + fmt(a.div_bruta_pl) + ' significa que para cada R$ 100 investidos pelos acionistas (capital próprio), a empresa possui R$ ' + fmt(a.div_bruta_pl * 100) + ' captados em dívidas com instituições financeiras.' : 'Valor não informado.'))}
                    ${metrica('Dívida Geral/Ativo', fmt(a.div_geral_ativo) + '%', false, 'div_geral_ativo', false, 'Fórmula: (Ativo Total - PL) / Ativo Total * 100<br>' + (a.div_geral_ativo != null && a.div_geral_ativo !== 0 ? 'Uma taxa de ' + fmt(a.div_geral_ativo) + '% significa que os recursos de terceiros (obrigações totais) financiaram R$ ' + fmt(a.div_geral_ativo) + ' para cada R$ 100 de ativos totais da empresa.' : 'Valor não informado.'))}
                    ${metrica('Endividamento', fmt(a['endividamento%']) + '%', false, 'endividamento%')}
                    ${metrica('Dív. Bruta', 'R$ ' + fmtBilhao(a.div_bruta), false, 'div_bruta')}
                    ${metrica('Disponibilidades', 'R$ ' + fmtBilhao(a.disponibilidades), false, 'disponibilidades', false, a.aplicacoes_financeiras ? 'Caixa e equivalentes + aplicações financeiras de curto prazo, como nas demais ferramentas (base da dívida líquida da ficha).<br>Caixa e equivalentes: R$ ' + fmtBilhao(a.caixa_equivalentes) + '.<br>Aplicações financeiras: R$ ' + fmtBilhao(a.aplicacoes_financeiras) + '.' : null)}
                    ${metrica('Dív. Líquida', 'R$ ' + fmtBilhao(a.div_liq), false, 'div_liq')}
                </div>

                <div class="metrica-group">
                    <h3>🏢 Balanço e DRE</h3>
                    ${metrica('Ativo Total', 'R$ ' + fmtBilhao(a.ativo_total), false, 'ativo_total')}
                    ${metrica('Imobilizado', 'R$ ' + fmtBilhao(a.imobilizado), false, 'imobilizado')}
                    ${metrica('Patr. Líquido', 'R$ ' + fmtBilhao(a.patrimonio_liquido), false, 'patrimonio_liquido')}
                    ${metrica('Capital de Giro (CDG)', 'R$ ' + fmtBilhao(a.cdg), false, 'cdg', false, 'Fórmula: PNC + PL - ANC<br>' + (a.cdg != null && a.cdg !== 0 ? 'O Capital de Giro de R$ ' + fmtBilhao(a.cdg) + (a.cdg < 0 ? ' negativo indica risco de liquidez, pois as obrigações de curto prazo superam os recursos disponíveis, podendo exigir captação de dívida emergencial.' : ' positivo sugere saúde financeira no curto prazo, indicando que a empresa possui folga de caixa para honrar obrigações e financiar sua operação.') : 'Valor não informado.'))}
                    ${metrica('Receita Líquida', 'R$ ' + fmtBilhao(a.receita_liquida), false, 'receita_liquida')}
                    ${metrica('Resultado Bruto', 'R$ ' + fmtBilhao(a.resultado_bruto), false, 'resultado_bruto')}
                    ${metrica('EBITDA', 'R$ ' + fmtBilhao(a.ebitda), false, 'ebitda')}
                    ${metrica('EBIT', 'R$ ' + fmtBilhao(a.ebit), false, 'ebit')}
                    ${metrica('Lucro Líquido', 'R$ ' + fmtBilhao(a.lucro_liquido), false, 'lucro_liquido', false, a.lucro_liquido_minoritarios ? 'Lucro consolidado total dos 12 meses (DRE, com os sócios minoritários das controladas), como nas demais ferramentas.<br>Atribuído aos acionistas da empresa (controladores): R$ ' + fmtBilhao(a.lucro_liquido_controladores) + '.<br>Atribuído aos não controladores (minoritários das controladas): R$ ' + fmtBilhao(a.lucro_liquido_minoritarios) + '.' : null)}
                </div>

                <div class="metrica-group">
                    <h3>💵 DFC</h3>
                    ${metrica('FCO', 'R$ ' + fmtBilhao(a.fco), false, 'fco')}
                    ${metrica('FCI', 'R$ ' + fmtBilhao(a.fci), false, 'fci')}
                    ${metrica('FCF', 'R$ ' + fmtBilhao(a.fcf), false, 'fcf')}
                    ${metrica('CAPEX (Investimentos)', 'R$ ' + fmtBilhao(a.capex), false, 'capex', false, 'Fórmula: Investimento em Bens de Capital<br>' + (a.capex != null && a.capex !== 0 ? 'O CAPEX de R$ ' + fmtBilhao(a.capex) + (a.capex > 0 ? ' positivo indica saída de recursos para investimentos na manutenção ou expansão da capacidade produtiva (como máquinas, instalações e tecnologia).' : ' negativo indica entrada líquida de caixa vinda da venda (desinvestimento) de ativos ou bens de capital.') : 'Valor não informado.'))}
                    ${metrica('Depreciação/Amort.', 'R$ ' + fmtBilhao(a.d_a), false, 'd_a')}
                    ${metrica('Variação NCG', 'R$ ' + fmtBilhao(a.var_ncg), false, 'var_ncg', false, 'Fórmula: NCG Atual - NCG Anterior<br>' + (a.var_ncg != null && a.var_ncg !== 0 ? 'A variação de NCG de R$ ' + fmtBilhao(a.var_ncg) + (a.var_ncg < 0 ? ' sugere redução na necessidade de capital de giro, indicando que houve liberação de recursos para o caixa da empresa no período (positivo para a geração de FCL).' : ' sugere aumento na necessidade de capital de giro, indicando que a empresa consumiu caixa no período para financiar suas operações diárias.') : 'Valor não informado.'))}
                    ${metrica('FCL', 'R$ ' + fmtBilhao(a.fcl), false, 'fcl', false, 'Fórmula: FCL = EBIT × (1 - IR) + D&A - CAPEX - Variação NCG<br>IR = 34% (IR 25% + CSLL 9%, alíquota padrão' + (aliquotaEfetivaTxt(a) ? '; a efetiva da empresa no período foi ' + aliquotaEfetivaTxt(a) : '') + ').<br>' + (a.fcl != null && a.fcl !== 0 ? 'O FCL de R$ ' + fmtBilhao(a.fcl) + (a.fcl < 0 ? ' indica consumo líquido de caixa no período, significando que o caixa operado foi insuficiente para cobrir reinvestimentos e capital de giro.' : ' indica geração de caixa livre, sobrando recursos para pagamento de dividendos, redução de dívidas ou reinvestimento.') : 'Valor não informado.'))}
                    ${metrica('Margem de FCL', fmt(a.margem_fcl) + '%', false, 'margem_fcl', false, 'Fórmula: FCL / Receita Líquida<br>' + (a.margem_fcl != null && a.margem_fcl !== 0 ? 'A Margem de FCL de ' + fmt(a.margem_fcl) + '% ' + (a.margem_fcl < 0 ? 'indica que a empresa consome mais caixa do que gera (deficit de fluxo de caixa livre), exigindo atenção.' : (a.margem_fcl >= 10.0 ? 'sugere excelente eficiência de caixa, indicando que a cada R$ 100 de faturamento, a empresa converte R$ ' + fmt(a.margem_fcl) + ' em dinheiro livre.' : 'indica geração de caixa saudável, porém moderada, restando R$ ' + fmt(a.margem_fcl) + ' livres de caixa a cada R$ 100 faturados.')) : 'Valor não informado.'))}
                    ${metrica('Qualidade do Lucro', fmt(a.qualidade_lucro), false, 'qualidade_lucro', false, 'Fórmula: FCO / Lucro Líquido<br>' + (a.qualidade_lucro != null && a.qualidade_lucro !== 0 ? 'O valor de ' + fmt(a.qualidade_lucro) + (a.qualidade_lucro < 0 ? ' indica sinal de alerta, pois a empresa consome caixa na sua operação ou reporta lucro sem entrada de dinheiro real.' : (a.qualidade_lucro >= 1.0 ? ' sugere excelente qualidade de lucro, pois a empresa converteu mais de 100% do lucro contábil em caixa real.' : ' sugere que parte do lucro contábil ainda não virou caixa operacional (comum por prazos de estoques ou recebíveis).')) : 'Valor não informado.'))}
                </div>

                ${ehBanco ? `
                <div class="metrica-group">
                    <h3>🏦 Indicadores Bancários</h3>
                    ${metrica('Índice Basileia', fmt(a.indice_basileia) + '%', false, 'indice_basileia')}
                    ${metrica('Imobilização', fmt(a.indice_imobilizacao) + '%', false, 'indice_imobilizacao')}
                    ${metrica('Custo do Risco', fmt(a.custo_do_risco) + '%', false, 'custo_do_risco', false, 'Fórmula: Provisão para Calotes / Carteira de Crédito Total<br>' + (a.custo_do_risco != null && a.custo_do_risco !== 0 ? 'O Custo do Risco de ' + fmt(a.custo_do_risco) + '% ' + (a.custo_do_risco <= 2.0 ? 'é excelente, indicando baixíssimo nível de inadimplência e excelente qualidade da carteira de crédito.' : (a.custo_do_risco <= 3.0 ? 'é bom, indicando inadimplência sob controle e provisões adequadas.' : (a.custo_do_risco <= 4.5 ? 'é moderado, indicando inadimplência em nível aceitável, mas sob monitoramento.' : 'é alto, servindo como sinal de alerta para o aumento da inadimplência ou concessão de crédito de maior risco.'))) : 'Valor não informado.'))}
                    ${metrica('Eficiência', fmt(a.indice_eficiencia) + '%', false, 'indice_eficiencia', false, 'Fórmula: Despesas Operacionais / Receitas Operacionais<br>' + (a.indice_eficiencia != null && a.indice_eficiencia !== 0 ? 'O valor de ' + fmt(a.indice_eficiencia) + '%' + (a.indice_eficiencia < 0 ? ' indica distorção contábil por prejuízo operacional ou eventos extraordinários.' : (a.indice_eficiencia < 50 ? ' sugere excelente eficiência operacional, indicando que o banco consome apenas ' + fmt(a.indice_eficiencia) + '% de suas receitas para cobrir despesas de funcionamento.' : (a.indice_eficiencia < 65 ? ' indica eficiência operacional saudável, dentro da média de mercado, onde o banco consome ' + fmt(a.indice_eficiencia) + '% de suas receitas.' : ' indica baixa eficiência operacional, alertando que o banco consome ' + fmt(a.indice_eficiencia) + '% de suas receitas para cobrir custos de funcionamento.'))) : 'Valor não informado.'))}
                    ${metrica('Créd/Captações', fmt(a.indice_credito_captacoes) + '%', false, 'indice_credito_captacoes', false, 'Fórmula: Carteira de Crédito / Captações Totais<br>Este indicador avalia a liquidez e a alavancagem de crédito do banco, medindo quanto dos recursos captados foi destinado a empréstimos.<br>' + (a.indice_credito_captacoes != null && a.indice_credito_captacoes !== 0 ? 'O índice de ' + fmt(a.indice_credito_captacoes) + '% ' + (a.indice_credito_captacoes <= 85.0 ? 'é considerado saudável, sugerindo excelente folga de liquidez e perfil conservador na concessão de crédito.' : (a.indice_credito_captacoes <= 95.0 ? 'é considerado adequado na relação entre empréstimos e captações, equilibrando de forma eficiente rentabilidade e controle de risco.' : (a.indice_credito_captacoes <= 105.0 ? 'indica necessidade de atenção, pois o volume de empréstimos está próximo ao limite dos depósitos, reduzindo a margem de segurança.' : 'indica sinal de alerta, pois a carteira de crédito supera as captações, forçando o banco a buscar recursos interbancários mais caros e elevando o risco de liquidez.'))) : 'Valor não informado.'))}
                    ${metrica('Carteira de Crédito', 'R$ ' + fmtBilhao(a.carteira_credito), false, 'carteira_credito')}
                    ${metrica('Captações', 'R$ ' + fmtBilhao(a.captacoes), false, 'captacoes')}
                    ${metrica('TVM', 'R$ ' + fmtBilhao(a.tvm), false, 'tvm', false, 'Títulos e Valores Mobiliários: Investimentos do banco em títulos e ativos financeiros.')}
                    ${metrica('PCLD', 'R$ ' + fmtBilhao(a.pcld), false, 'pcld', false, 'Provisão para Créditos de Liquidação Duvidosa: Reserva para cobrir possíveis calotes.')}
                </div>` : ''}
            </div>

            <div id="momentumContainer"></div>

            <div style="color:var(--text-muted);font-size:12px;text-align:center;padding:16px 0 16px 0;">
                <span style="display:inline-block;margin:0 8px;">🟢 <b>Destaque Verde:</b> ROE > 15% | Yield > 6% | CAGR > 5%</span>
                <span style="display:inline-block;margin:0 8px;">🔴 <b>Atenção:</b> Valores negativos</span>
            </div>

            <div id="modalGraficoHistory" class="modal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.6);">
                <div id="modalGraficoContent" style="background-color:#ffffff; padding:24px 50px 24px 24px; border-radius:12px; width:95%; max-width:1180px; min-height:550px; position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
                    
                    <span onclick="fecharGrafico()" style="position:absolute; right:20px; top:15px; font-size:28px; cursor:pointer; color:var(--text-muted); z-index: 10001;">&times;</span>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:12px; padding-right: 40px;">
                        <h3 id="tituloGraficoHistory" style="margin:0; color:var(--text-primary); cursor:move; user-select:none; min-width: 150px;">Histórico</h3>
            
						<div style="display:flex; gap:12px; align-items:center; flex-wrap: nowrap !important; justify-content: flex-start; flex: 1;">
                        
                            <select id="metricSelect" onchange="mudarMetricaGrafico(this)" style="padding:6px 28px 6px 12px; border-radius:20px; border:1px solid var(--border-glass); background-color:var(--bg-primary); color:var(--text-primary); font-size:13px; font-weight:600; cursor:pointer; outline:none; appearance:none; background-image:url(&quot;data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e&quot;); background-repeat:no-repeat; background-position:right 10px center; background-size:14px; max-width:180px;">
                                <optgroup label="Valuation">
                                    <option value="p_l">P/L</option>
                                    <option value="p_vpa">P/VPA</option>
                                    <option value="p_fcl">P/FCL</option>
                                    <option value="fcl_yield">FCL Yield</option>
                                    <option value="ev_ebit">EV/EBIT</option>
                                    <option value="ev_ebitda">EV/EBITDA</option>
                                    <option value="peg_ratio">PEG Ratio</option>
                                    <option value="lpa">LPA</option>
                                    <option value="vpa">VPA</option>
                                </optgroup>
                                <optgroup label="Rentabilidade">
                                    <option value="roe">ROE</option>
                                    <option value="roe_media">ROE Média</option>
                                    <option value="roa">ROA</option>
                                    <option value="margem">Margem</option>
                                    <option value="margem_media">Margem Média</option>
                                    <option value="roic">ROIC</option>
                                    <option value="roic_media">ROIC Média</option>
                                    <option value="roce">ROCE</option>
                                    <option value="roce_media">ROCE Média</option>
                                </optgroup>
                                <optgroup label="Dividendos">
                                    <option value="dy">Dividend Yield</option>
                                    <option value="dy_media">DY Média</option>
                                    <option value="dpa">DPA</option>
                                    <option value="payout">Payout</option>
                                    <option value="dividendos">Total Pago no Ano</option>
                                    <option value="dividen_media">Dividendo Médio Pago</option>
                                </optgroup>
                                <optgroup label="Endividamento">
                                    <option value="div_liq_ebit">Dív.Líq/EBIT</option>
                                    <option value="div_liq_ebitda">Dív.Líq/EBITDA</option>
                                    <option value="div_liq_pl">Dív.Líq/PL</option>
                                    <option value="endividamento%">Endividamento %</option>
                                    <option value="div_bruta">Dívida Bruta</option>
                                    <option value="disponibilidades">Disponibilidades</option>
                                    <option value="div_liq">Dívida Líquida</option>
                                </optgroup>
                                <optgroup label="Balanço e DRE">
                                    <option value="ativo_total">Ativo Total</option>
                                    <option value="imobilizado">Imobilizado</option>
                                    <option value="patrimonio_liquido">Patrimônio Líquido</option>
                                    <option value="cdg">Capital de Giro (CDG)</option>
                                    <option value="receita_liquida">Receita Líquida</option>
                                    <option value="resultado_bruto">Resultado Bruto</option>
                                    <option value="ebitda">EBITDA</option>
                                    <option value="ebit">EBIT</option>
                                    <option value="lucro_liquido">Lucro Líquido</option>
                                </optgroup>
                                <optgroup label="Indicadores Bancários">
                                    <option value="indice_basileia">Índice Basileia</option>
                                    <option value="indice_imobilizacao">Imobilização</option>
                                    <option value="custo_do_risco">Custo do Risco</option>
                                    <option value="indice_eficiencia">Eficiência</option>
                                    <option value="indice_credito_captacoes">Créd/Captações</option>
                                    <option value="carteira_credito">Carteira de Crédito</option>
                                    <option value="captacoes">Captações</option>
                                    <option value="tvm">TVM</option>
                                    <option value="pcld">PCLD</option>
                                </optgroup>
                                <optgroup label="DFC">
                                    <option value="fco">FCO</option>
                                    <option value="fci">FCI</option>
                                    <option value="fcf">FCF</option>
                                    <option value="capex">CAPEX</option>
                                    <option value="fcl">FCL</option>
                                    <option value="margem_fcl">Margem de FCL</option>
                                    <option value="qualidade_lucro">Qualidade do Lucro</option>
                                    <option value="d_a">Depreciação/Amort.</option>
                                    <option value="var_ncg">Variação NCG</option>
                                </optgroup>
                                <optgroup label="CAGR">
                                    <option value="lucro_liq_cagr">Lucro CAGR</option>
                                    <option value="rec_liq_cagr">Receita CAGR</option>
                                    <option value="lpa_cagr">LPA CAGR</option>
                                    <option value="vpa_cagr">VPA CAGR</option>
                                    <option value="dpa_cagr">DPA CAGR</option>
                                    <option value="pat_liq_cagr">PL CAGR</option>
                                    <option value="fcl_cagr">FCL CAGR</option>
                                    <option value="ebit_cagr">EBIT CAGR</option>
                                    <option value="ebitda_cagr">EBITDA CAGR</option>
                                </optgroup>
                            </select>
            
                            <div id="graficoFormatoToggles" style="display:flex; gap:10px; background:var(--bg-primary); border: 1px solid var(--border-glass); padding:6px 12px; border-radius:20px; font-size:12px; color:var(--text-secondary); white-space:nowrap;">
                                <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
                                    <input type="radio" name="formatoGrafico" value="line" checked onchange="desenharGrafico()"> 📈 Linha
                                </label>
                                <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
                                    <input type="radio" name="formatoGrafico" value="bar" onchange="desenharGrafico()"> 📊 Barra
                                </label>
                            </div>
            
                            <div id="graficoTipoToggles" style="display:flex; gap:12px; background:var(--bg-primary); border: 1px solid var(--border-glass); padding:6px 16px; border-radius:20px; font-size:12px; color:var(--text-secondary); white-space:nowrap; align-items:center; min-width: fit-content;">
                                <span style="font-weight: 600; color: var(--text-primary);">Valor:</span>
                                <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
                                    <input type="radio" name="tipoGrafico" value="ANUAL" checked onchange="mudarTipoGrafico(this)"> Anual
                                </label>
                                <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
                                    <input type="radio" name="tipoGrafico" value="TRI" onchange="mudarTipoGrafico(this)"> Trimestral (12 meses)
                                </label>
                                <!-- P-HIST-03 (14/10/2026): 3 meses e acumulado só nas métricas de METRICAS_PERIODO (fluxos e margens) -->
                                <label id="grafico-modo-tri3" style="cursor:pointer; display:flex; align-items:center; gap:6px;">
                                    <input type="radio" name="tipoGrafico" value="TRI3" onchange="mudarTipoGrafico(this)"> Trimestral (3 meses)
                                </label>
                                <label id="grafico-modo-ytd" style="cursor:pointer; display:flex; align-items:center; gap:6px;">
                                    <input type="radio" name="tipoGrafico" value="YTD" onchange="mudarTipoGrafico(this)"> Acumulado no ano
                                    <span class="fcff-hint" tabindex="0" aria-label="Ajuda">?<span class="fcff-hint-bubble fcff-hint-below" role="tooltip">Soma dos trimestres desde o início do exercício fiscal da empresa até a data. Quase todas fecham o exercício em dezembro; as que fecham em março ou junho (Raízen, São Martinho, Jalles, CTC, BrasilAgro) acumulam desde o início do exercício delas.</span></span>
                                </label>
                                <span id="grafico-modo-nota" style="display:none; color:var(--text-muted); font-style:italic;"></span>
                            </div>
                        </div>
                    </div>
                    <div id="graficoHistoryCanvas" style="width:100%; height:450px;"></div>
                </div>
            </div>
        `;

        carregarGraficos(a.ticker);
        carregarValuationPainel(a.ticker);

        // Função para atualizar preço em tempo real
        function atualizarPrecoRealtime() {
            fetch(`${API_BASE}/cotacoes/${a.ticker}/realtime`)
                .then(res => { if (res.ok) return res.json(); throw new Error(); })
                .then(dadosRt => {
                    const preco = dadosRt.preco;
                    const varPercent = dadosRt.taxa;
                    const varRs = dadosRt.var_rs;
                    
                    const badge = document.getElementById('badge-variacao');
                    if (badge) {
                        badge.className = varPercent >= 0 ? 'positive' : 'negative';
                        badge.style.color = '';
                        badge.innerHTML = `${varPercent >= 0 ? '▲' : '▼'} R$ ${fmt(Math.abs(varRs))} (${varPercent >= 0 ? '+' : ''}${fmt(varPercent)}%)`;
                    }
                    const precoEl = document.getElementById('preco-atual');
                    if (precoEl && preco) {
                        precoEl.innerHTML = `R$ ${fmt(preco)}`;
                        precoEl.title = `Atualizado em: ${dadosRt.atualizado_em} (delay 15m)`;
                        if (window.acaoAtiva) {
                            window.acaoAtiva.preco = preco;
                            if (window.acaoAtiva.valuation_data) {
                                const container = document.getElementById('valuation-container');
                                if (container) renderizarValuation(window.acaoAtiva.ticker, window.acaoAtiva.valuation_data, container);
                            }
                        }
                    }
                }).catch(() => {
                    // Mantém fallback silencioso se falhar, o card já tem preço diário de backup (D-1)
                    const badge = document.getElementById('badge-variacao');
                    if (badge && badge.innerHTML.includes('⏳')) badge.innerHTML = '—';
                });
        }
        
        // Chamada inicial
        atualizarPrecoRealtime();
        
        // Configura o loop de 10 min (600000 ms)
        if (window.intervaloRealtime) clearInterval(window.intervaloRealtime);
        window.intervaloRealtime = setInterval(atualizarPrecoRealtime, 600000);

        fetch(`${API_BASE}/momentum/${a.ticker}`)
            .then(res => { if (res.ok) return res.json(); throw new Error(); })
            .then(m => {
                const mc = document.getElementById('momentumContainer');
                if (mc && m) {
                    const fmtPct = v => {
                        const num = parseFloat(v);
                        return !isNaN(num) ? (num * 100).toFixed(2) + '%' : 'N/D';
                    };
                    const isPos = v => parseFloat(v) > 0;
                    mc.innerHTML = `
                        <h3 style="margin:24px 0 12px 0; color:var(--text-primary); border-bottom:1px solid #334155; padding-bottom:8px;">🚀 Taxa Acumulada (Preço)</h3>
                        <div class="metricas-grid" style="margin-bottom:0;">
                            <div class="metrica-group">
                                ${metrica('Taxa 1 mês', fmtPct(m.momentum_1m), isPos(m.momentum_1m))}
                                ${metrica('Taxa 3 meses', fmtPct(m.momentum_3m), isPos(m.momentum_3m))}
                            </div>
                            <div class="metrica-group">
                                ${metrica('Taxa 6 meses', fmtPct(m.momentum_6m), isPos(m.momentum_6m))}
                                ${metrica('Taxa 12 meses', fmtPct(m.momentum_12m), isPos(m.momentum_12m))}
                            </div>
                            <div class="metrica-group">
                                ${metrica('Volatilidade 3m', fmtPct(m.volatilidade_3m))}
                                ${metrica('Volatilidade 6m', fmtPct(m.volatilidade_6m))}
                            </div>
                            <div class="metrica-group">
                                ${metrica('Volatilidade 12m', fmtPct(m.volatilidade_12m))}
                                ${metrica('Desvio Padrão', fmtPct(m.taxa_desvio_padrao_12m), false, null, false, 'Variação média bruta dos retornos mês a mês do ativo no período histórico de 1 ano.')}
                            </div>
                        </div>
                    `;
                }
            }).catch(err => console.log('Momentum indisponível'));

    } catch (err) {
        container.innerHTML = '<div style="color:var(--accent-red);text-align:center;padding:40px">Erro ao carregar dados. Verifique o servidor.</div>';
        console.error(err);
    }
}

// ====================== HELPERS ======================

// 🔴 CHAVE LIGA/DESLIGA DOS BOTÕES DE CAGR E MÉDIA:
// true  = Esconde "Anual, Tri, YTD" nas métricas de CAGR e Média.
// false = Mostra "Anual, Tri, YTD" sempre, em todas as métricas.
const OCULTAR_BOTOES_CAGR_MEDIA = true;

// P-HIST-03 (14/10/2026): métricas que existem no trimestre de 3 meses e no acumulado (fluxos e margens do mesmo período). As demais
// misturam o período com preço ou saldo (P/L ≈ 4×, ROE ≈ ¼) ou só existem em 12 meses (dividendos). P-HIST-04 (14/10): margem de FCL e
// margem EBITDA entram — a relcontabeis_otimizada passou a dividir pela receita do mesmo período (antes, pela de 12 meses).
const METRICAS_PERIODO = new Set(['receita_liquida', 'resultado_bruto', 'ebitda', 'ebit', 'lucro_liquido', 'fco', 'fci', 'fcf',
    'capex', 'fcl', 'd_a', 'var_ncg', 'pcld', 'lpa', 'margem', 'qualidade_lucro', 'margem_fcl', 'margem_ebitda']);
const MODOS_PERIODO = ['TRI3', 'YTD'];

// Mostra "3 meses" e "Acumulado" só nas métricas de METRICAS_PERIODO; com um deles ativo e outra métrica, volta aos 12 meses (com nota).
function aplicarModosPeriodoGrafico(key) {
    const permitido = METRICAS_PERIODO.has(key);
    ['grafico-modo-tri3', 'grafico-modo-ytd'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = permitido ? 'flex' : 'none';
    });
    const nota = document.getElementById('grafico-modo-nota');
    const marcado = document.querySelector('input[name="tipoGrafico"]:checked');
    if (!permitido && marcado && MODOS_PERIODO.includes(marcado.value)) {
        const rdTri = document.querySelector('input[name="tipoGrafico"][value="TRI"]');
        if (rdTri) rdTri.checked = true;
        if (nota) { nota.textContent = 'Esta métrica só existe em 12 meses.'; nota.style.display = 'inline'; }
        return 'TRI';
    }
    if (nota) nota.style.display = 'none';
    return null;
}

let currentChartLabel = '';
let currentChartKey = '';

window.mudarMetricaGrafico = function (selectEl) {
    if (!window.acaoAtiva) return;

    currentChartKey = selectEl.value;
    currentChartLabel = selectEl.options[selectEl.selectedIndex].text;

    const ehMetricaEspecial = currentChartKey.includes('cagr') || currentChartKey.includes('media');
    window.currentIsCagr = ehMetricaEspecial;

    const controls = document.getElementById('graficoTipoToggles');
    if (controls) {
        if (ehMetricaEspecial && OCULTAR_BOTOES_CAGR_MEDIA) {
            controls.style.display = 'none';
        } else {
            controls.style.display = 'flex';
        }
    }

    const voltaPara = aplicarModosPeriodoGrafico(currentChartKey);  // P-HIST-03
    if (voltaPara && !ehMetricaEspecial) { mudarTipoGrafico({ value: voltaPara }); return; }

    desenharGrafico();
}

window.abrirGrafico = function (label, key, isCagr = false) {
    if (!window.acaoAtiva) return;
    currentChartLabel = label;
    currentChartKey = key;

    const ehMetricaEspecial = key.includes('cagr') || key.includes('media');
    window.currentIsCagr = ehMetricaEspecial;

    const metricSelect = document.getElementById('metricSelect');
    if (metricSelect) {
        let optionExists = Array.from(metricSelect.options).some(opt => opt.value === key);
        if (optionExists) {
            metricSelect.value = key;
        } else {
            let novaOpcao = new Option(label, key);
            metricSelect.add(novaOpcao);
            metricSelect.value = key;
        }
    }

    const controls = document.getElementById('graficoTipoToggles');
    if (controls) {
        if (ehMetricaEspecial && OCULTAR_BOTOES_CAGR_MEDIA) {
            controls.style.display = 'none';
        } else {
            controls.style.display = 'flex';
        }
    }

    if (window.currentIsCagr) {
        desenharGrafico();
        return;
    }

    if (!window.acaoAtiva.cacheHistorico) {
        window.acaoAtiva.cacheHistorico = {
            'ANUAL': window.acaoAtiva.historico
        };
    }

    const rdAnual = document.querySelector('input[name="tipoGrafico"][value="ANUAL"]');
    if (rdAnual) rdAnual.checked = true;
    aplicarModosPeriodoGrafico(key);  // P-HIST-03

    if (window.acaoAtiva.cacheHistorico['ANUAL']) {
        window.acaoAtiva.historico = window.acaoAtiva.cacheHistorico['ANUAL'];
        desenharGrafico();
    } else {
        mudarTipoGrafico({ value: 'ANUAL' });
    }
};

window.mudarTipoGrafico = async function (radio) {
    const tipo = radio.value || radio; // aceita elemento ou string
    const ticker = window.acaoAtiva.ticker;

    if (!window.acaoAtiva.cacheHistorico) window.acaoAtiva.cacheHistorico = {};

    if (window.acaoAtiva.cacheHistorico[tipo]) {
        window.acaoAtiva.historico = window.acaoAtiva.cacheHistorico[tipo];
        desenharGrafico();
        return;
    }

    const canvas = document.getElementById('graficoHistoryCanvas');
    if (canvas) canvas.style.opacity = '0.4';

    try {
        const resp = await fetch(`${API_BASE}/acoes/${ticker}/historico?tipo=${tipo}`);
        if (resp.ok) {
            const data = await resp.json();
            window.acaoAtiva.historico = data;
            window.acaoAtiva.cacheHistorico[tipo] = data;
            desenharGrafico();
        }
    } catch (err) {
        console.error(err);
    } finally {
        if (canvas) canvas.style.opacity = '1';
    }
};

function desenharGrafico() {
    if (!window.acaoAtiva) return;

    let baseHist = [];
    if (window.currentIsCagr) {
        baseHist = window.acaoAtiva.historicoCagr || [];
    } else {
        baseHist = window.acaoAtiva.historico || [];
    }

    if (!baseHist || baseHist.length === 0) return;

    const radioChecked = document.querySelector('input[name="tipoGrafico"]:checked');
    const tipoAtual = radioChecked ? radioChecked.value : 'ANUAL';

    const hist = baseHist.map(d => {
        let val = d[currentChartKey];   // eficiência já em pontos percentuais (11/10/2026)
        return {
            ano: d.dt_fin_exerc ? (tipoAtual === 'ANUAL' ? d.dt_fin_exerc.substring(0, 4) : d.dt_fin_exerc.substring(0, 10).split('-').reverse().join('/')) : 'N/D',
            valor: val
        };
    }).filter(d => d.valor != null).reverse();

    const tituloEl = document.getElementById('tituloGraficoHistory');
    if (tituloEl) tituloEl.innerText = 'Histórico (' + window.acaoAtiva.ticker + ')';

    const modalEl = document.getElementById('modalGraficoHistory');
    if (modalEl) modalEl.style.display = 'flex';

    const formatoChecked = document.querySelector('input[name="formatoGrafico"]:checked');
    const chartType = formatoChecked ? formatoChecked.value : 'line';

    const trace = {
        x: hist.map(d => d.ano),
        y: hist.map(d => d.valor),
        type: chartType === 'bar' ? 'bar' : 'scatter',
        text: hist.map(d => {
            const abs = Math.abs(d.valor);
            let txt = '';
            if (abs >= 1e6) {
                txt = fmtBilhao(d.valor);
            } else {
                txt = (String(d.valor).includes('.') || String(d.valor).includes(',') || abs < 1000) ? fmt(d.valor) : fmtInt(d.valor);
            }
            if (METRICAS_GRUPOS[currentChartKey] === 'PERCENTUAL' || currentChartKey.includes('%') || currentChartKey.includes('cagr') || currentChartKey.includes('margem') || currentChartKey.includes('taxa') || currentChartKey.includes('roe') || currentChartKey.includes('roa') || currentChartKey.includes('dy') || currentChartKey.includes('payout')) {
                txt += '%';
            }
            return txt;
        })
    };

    if (chartType === 'line') {
        trace.mode = 'lines+markers';
        trace.line = { color: '#3b82f6', width: 3 };
        trace.marker = { size: 8, color: '#2563eb' };
        trace.hovertemplate = '%{text}<extra></extra>';
        trace.hoverlabel = { bgcolor: 'rgba(253,186,116,0.3)', font: { color: '#431407', size: 14 }, bordercolor: '#94a3b8' };
    } else {
        trace.textposition = 'auto';
        trace.marker = { color: '#3b82f6' };
        trace.hovertemplate = '%{x}<br>%{text}<extra></extra>';
        trace.hoverlabel = { bgcolor: 'rgba(253,186,116,0.3)', font: { color: '#431407', size: 14 }, bordercolor: '#94a3b8' };
    }

    const layout = {
        margin: { t: 20, r: 20, l: 40, b: 80 },
        xaxis: { type: 'category', tickangle: -45 }
    };

    Plotly.newPlot('graficoHistoryCanvas', [trace], layout, { displayModeBar: true, scrollZoom: true });
}

// Card do lucro pelo total; LPA, P/L e ROE pelos acionistas da empresa (controladores), como as demais ferramentas;
// o "?" mostra o cálculo pelo lucro consolidado total — acoes_service._anexar_lucro_consolidado
function lucroTotalHint(nome, conta, valorTotal) {
    if (valorTotal == null) return null;
    return nome + ' pelo lucro atribuído aos acionistas da empresa (controladores)' + (conta ? ' ' + conta : '') + ', como nas demais ferramentas.<br>Pelo lucro consolidado total (com os sócios minoritários das controladas), só referência: ' + valorTotal + '.';
}

// Ficha e gráficos pelo total de ações emitidas (com a tesouraria) — acoes_service._anexar_acoes_totais
function acoesTotaisHint(a) {
    if (!a || !a.acoes_tesouraria) return null;
    return 'Ações: ' + fmtInt(a.acoes_total) + ' emitidas (total, base do LPA, VPA, DPA, P/L, P/VPA, DY e valor de mercado da ficha), das quais ' + fmtInt(a.acoes_tesouraria) + ' em tesouraria; em circulação: ' + fmtInt(a.acoes_circulacao) + ' (base do valuation).';
}

// Alíquota efetiva (IR + CSLL ÷ lucro antes dos impostos) da ficha, em %
function aliquotaEfetivaTxt(a) {
    const v = a ? Number(a.aliquota_efetiva) : NaN;
    if (!isFinite(v) || v === 0) return null;
    return fmt(Math.abs(v) < 1 ? v * 100 : v) + '%';
}

// Período real de cada CAGR (acoes_service._corrigir_cagr): o histórico começa em 03/2020 e o FCFF em 12/2021
function cagrPeriodoHint(a, campo) {
    const p = a && a.cagr_periodos ? a.cagr_periodos[campo] : null;
    if (!p) return null;
    const mes = (iso) => iso.slice(5, 7) + '/' + iso.slice(0, 4);
    let txt = 'Período: ' + mes(p.inicio) + ' → ' + mes(p.fim) + ' (' + fmt(p.anos) + ' anos; valores de 12 meses).';
    if (p.valor_inicial != null && p.valor_final != null) {
        txt += '<br>' + (campo === 'dpa_cagr' ? 'Dividendos de' : 'De') + ' R$ ' + fmtBilhao(p.valor_inicial) + ' para R$ ' + fmtBilhao(p.valor_final) + '.';
    }
    const pedido = Number(window.periodoAnos || 5);
    if (p.anos < pedido - 0.2) {
        txt += '<br>O histórico disponível começa em ' + mes(p.inicio) + ': o período é menor que os ' + pedido + ' anos escolhidos (a taxa é anual, pelo período real).';
    }
    if (p.valor_inicial != null && p.valor_final != null && (p.valor_inicial <= 0 || p.valor_final <= 0)) {
        txt += '<br>Sem CAGR: uma das pontas é zero ou negativa.';
    }
    return txt;
}

function metrica(label, value, highlight = false, chartKey = null, isCagr = false, tooltip = null) {
    let extraClass = highlight ? 'positive' : '';
    if (String(value).includes('-') && String(value) !== '—') {
        extraClass = 'negative';
    }

    let iconHtml = '';
    if (chartKey) {
        iconHtml = `<span onclick="abrirGrafico('${label}', '${chartKey}', ${isCagr})" style="cursor:pointer; font-size:1.1em; margin-right:6px; filter: grayscale(1); transition: 0.2s;" onmouseover="this.style.filter='grayscale(0)'" onmouseout="this.style.filter='grayscale(1)'" title="Ver Histórico">📈</span>`;
    }

    if (tooltip) {
        return `<div class="metrica-row">
            <span class="label tooltip-wrapper" style="display:flex; align-items:center;">
                ${iconHtml}<span class="tooltip-text-dotted">${label}</span>
                <span class="tooltip-box">${tooltip}</span>
            </span>
            <span class="value ${extraClass}">${value}</span>
        </div>`;
    }

    return `<div class="metrica-row">
        <span class="label" style="display:flex; align-items:center;">${iconHtml}${label}</span>
        <span class="value ${extraClass}">${value}</span>
    </div>`;
}

function fmt(v) {
    if (v === null || v === undefined) return '—';
    return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtBilhao(v) {
    if (!v || v === 0) return '—';
    const abs = Math.abs(v);
    if (abs >= 1e9) return (v / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Bi';
    if (abs >= 1e6) return (v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Mi';
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function fmtMilhao(v) {
    if (!v || v === 0) return '—';
    return (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' Mi';
}

function fmtInt(v) {
    if (!v) return '—';
    return Math.round(v).toLocaleString('pt-BR');
}

function truncar(texto, max) {
    if (!texto) return '—';
    return texto.length > max ? texto.substring(0, max) + '…' : texto;
}

function formatarDataBR(isoDate) {
    if (!isoDate) return '—';
    var parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
}

// ====================== MODAL DRAG E CONTROLES ======================
let isDraggingModal = false;
let dragStartX = 0, dragStartY = 0, modalStartX = 0, modalStartY = 0;

document.addEventListener('mousedown', function (e) {
    if (e.target && e.target.id === 'tituloGraficoHistory') {
        isDraggingModal = true;
        const modal = document.getElementById('modalGraficoContent');
        const rect = modal.getBoundingClientRect();

        modalStartX = rect.left;
        modalStartY = rect.top;

        modal.style.transform = 'none';
        modal.style.left = modalStartX + 'px';
        modal.style.top = modalStartY + 'px';

        dragStartX = e.clientX;
        dragStartY = e.clientY;
        document.body.style.userSelect = 'none';
    }
});

document.addEventListener('mousemove', function (e) {
    if (isDraggingModal) {
        const modal = document.getElementById('modalGraficoContent');
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        modal.style.left = (modalStartX + dx) + 'px';
        modal.style.top = (modalStartY + dy) + 'px';
    }
});

document.addEventListener('mouseup', function (e) {
    if (isDraggingModal) {
        isDraggingModal = false;
        document.body.style.userSelect = '';
    }
});

function fecharGrafico() {
    const modalBg = document.getElementById('modalGraficoHistory');
    if (modalBg) modalBg.style.display = 'none';
    const modal = document.getElementById('modalGraficoContent');
    if (modal) {
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
    }
}

document.addEventListener('click', function (e) {
    const modalBg = document.getElementById('modalGraficoHistory');
    if (e.target === modalBg) {
        fecharGrafico();
    }
});

// ====================== EXPORTAÇÃO EXCEL ======================
function exportarExcel() {
    // Paywall: bloqueio do Salvar para gratuitos (trial expirado)
    const _userPlano = localStorage.getItem('user_plano');
    const _userPlanoId = parseInt(localStorage.getItem('user_plano_id'));
    const _isTrial = localStorage.getItem('is_trial') === 'true';
    const _isAdmin = localStorage.getItem('is_admin') === 'true';
    const _isPremium = _userPlano === 'Premium' || _userPlanoId === 9 || _isAdmin;
    if (!_isPremium && !_isTrial) {
        mostrarToastPremium('O acesso ao botão Salvar é exclusivo Premium.', document.getElementById('btn-salvar-excel'));
        return;
    }

    if (!window.rankingAtualData || window.rankingAtualData.length === 0) {
        alert("Nenhum dado carregado para exportar.");
        return;
    }

    const dados = window.rankingAtualData;
    const cenarioSelect = document.getElementById('select-cenario');
    const cenario = cenarioSelect ? cenarioSelect.value : 'Geral';

    const chaves = Object.keys(dados[0]).filter(k => k !== 'ranking_no_segmento' && k !== 'optimization_goal');
    let csvContent = chaves.map(c => c.toUpperCase()).join(";") + "\n";

    dados.forEach(acao => {
        const linha = chaves.map(k => {
            let val = acao[k];
            if (val === null || val === undefined) return '';
            if (typeof val === 'string') return val.replace(/;/g, ',');
            if (typeof val === 'number') return String(val).replace('.', ',');
            return val;
        });
        csvContent += linha.join(";") + "\n";
    });

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dataHora = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `Ranking_${cenario}_${dataHora}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ====================== VALUATION INTRÍNSECO (PREMIUM) ======================

let _valuationDebounce = null;

async function carregarValuationPainel(ticker) {
    const container = document.getElementById('valuation-container');
    if (!container) return;

    container.innerHTML = `<div class="loading" style="padding:20px;text-align:center;">⏳ Calculando valuation...</div>`;

    const wacc = document.getElementById('input-wacc')?.value || 12;
    const g    = document.getElementById('input-g')?.value    || 3;
    const rf   = document.getElementById('input-rf')?.value   || 12;

    try {
        const resp = await fetch(`${API_BASE}/acoes/${ticker}/valuation?taxa_desconto=${wacc}&g_perpetuidade=${g}&rf=${rf}&forcar_recalculo=true`);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            container.innerHTML = `<div style="color:var(--accent-red);padding:16px;text-align:center;">Erro ao calcular valuation: ${err.detail || resp.status}</div>`;
            return;
        }
        const dados = await resp.json();
        renderizarValuation(ticker, dados, container);
    } catch (e) {
        container.innerHTML = `<div style="color:var(--accent-red);padding:16px;text-align:center;">Erro de conexão ao calcular valuation.</div>`;
        console.error(e);
    }
}

function normalizeValuationCardResult(result) {
    if (!result || result.preco === null || result.preco === undefined || result.preco === '') return null;
    const preco = Number(result.preco);
    if (!Number.isFinite(preco)) return null;
    // P-HARM-01 H11 (c): valor por ação ≤ 0 continua no card, sem upside e com aviso.
    if (preco <= 0 && (result.upside === null || result.upside === undefined || result.upside === '')) {
        return { ...result, preco, upside: null, semValorPositivo: true };
    }
    if (result.upside === null || result.upside === undefined || result.upside === '') return null;
    const upside = Number(result.upside);
    if (!Number.isFinite(upside)) return null;
    return { ...result, preco, upside };
}

function parseDisplayedBrl(text) {
    if (typeof text !== 'string') return Number.NaN;
    const normalized = text.trim().replace(/^R\$\s*/, '').replace(/\./g, '').replace(',', '.');
    if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return Number.NaN;
    const value = Number(normalized);
    return Number.isFinite(value) ? value : Number.NaN;
}

function valuationRouteModal(acao) {
    return acao && acao.valuation_route && acao.valuation_route.modal ? acao.valuation_route.modal : null;
}

// P-PATR-01 F3-D6: consulta o motor do roteamento ao abrir o ativo, para o card mostrar o rótulo certo.
function garantirRotaValuation(acao, ticker) {
    if (!acao || !ticker || acao.ticker !== ticker || acao.valuation_route || acao._rotaValuationPendente) return;
    if (typeof fetch !== 'function') return;
    acao._rotaValuationPendente = true;
    fetch(`/api/v1/valuation/route/${encodeURIComponent(ticker)}`)
        .then((resp) => (resp.ok ? resp.json() : null))
        .then((route) => {
            if (!route || !window.acaoAtiva || window.acaoAtiva !== acao) return;
            acao.valuation_route = route;
            refreshCurrentValuationCard(window, document, renderizarValuation);
        })
        .catch(() => {})
        .finally(() => { acao._rotaValuationPendente = false; });
}

function refreshCurrentValuationCard(windowRef, documentRef, renderFn) {
    const active = windowRef && windowRef.acaoAtiva;
    const container = documentRef && documentRef.getElementById('valuation-container');
    if (!active || !active.ticker || !active.valuation_data || !container || typeof renderFn !== 'function') return false;
    renderFn(active.ticker, active.valuation_data, container);
    return true;
}

// P-PORTAL-01 D1: o Gordon do backend legado (Ke 9% nos bancos e seguradoras) não aparece nas empresas do motor de
// patrimônio — nem antes de a rota responder, nem quando ela falha (o legado marca bancos e seguradoras com eh_banco).
function ocultarGordonLegado(rotaModal, d) {
    return rotaModal === 'PATRIMONIO_V1' || Boolean(d && d.eh_banco);
}

// P-PORTAL-01 D4: a rota de valuation falhou → aviso pelo motivo e nenhum motor aberto (a base do FCFF também recusa
// quem não é do FCFF). Ticker fora do padrão não melhora numa nova tentativa.
function falhaRotaValuation(falha) {
    const semMotor = ' Nenhum modelo foi aberto, para não avaliar a empresa pelo motor errado.';
    if (falha && falha.status === 422) {
        return { mensagem: 'Ticker fora do padrão aceito pelo valuation (raiz de 4 caracteres, como PETR ou B3SA, e 1 ou 2 dígitos).', tentarDeNovo: false };
    }
    if (!falha || falha.tipo === 'rede') {
        return { mensagem: `Sem resposta do servidor ao identificar o motor de valuation deste ticker.${semMotor}`, tentarDeNovo: true };
    }
    if (falha.status >= 500) {
        return { mensagem: `O servidor não conseguiu consultar o roteamento de valuation (erro ${falha.status}).${semMotor}`, tentarDeNovo: true };
    }
    return { mensagem: `Não foi possível identificar o motor de valuation deste ticker (erro ${falha.status}).${semMotor}`, tentarDeNovo: true };
}

function renderizarValuation(ticker, d, container) {
    // P-PATR-01 F3-D6/D7: o motor vem do roteamento do backend (GET /valuation/route) e o card só
    // mostra resultado calculado pela API; o DDM legado em JS e o cálculo silencioso foram removidos.
    garantirRotaValuation(window.acaoAtiva, ticker);
    const rotaModal = valuationRouteModal(window.acaoAtiva);
    const isPatrimonio = rotaModal === 'PATRIMONIO_V1';
    const isBancoOuSeguro = Boolean(d.eh_banco) || isPatrimonio; // rótulos Ke/WACC do card de modelos (backend legado)
    const ocultarGordon = ocultarGordonLegado(rotaModal, d);
    const adaptador = isPatrimonio && window.acaoAtiva && window.acaoAtiva.valuation_route ? window.acaoAtiva.valuation_route.adapter : null;
    const termVal = isPatrimonio ? ({ IMOBILIARIAS: 'DDM Imobiliárias', SEGUROS: 'DDM Seguradoras' }[adaptador] || 'DDM') : (rotaModal === 'FCFF_V1' ? 'FCFF/DCF' : 'Valuation');
    const hintVal = isPatrimonio
        ? 'Modelo de Desconto de Dividendos (DDM) do motor de patrimônio: valor presente dos dividendos + JCP projetados e do valor terminal, pelo custo do capital próprio (Ke). Calculado pela API.'
        : (rotaModal === 'FCFF_V1'
            ? 'Fluxo de Caixa Descontado (DCF): Estima o preço justo da ação trazendo ao presente o dinheiro livre (fluxo de caixa) que a empresa deve gerar no futuro, descontando os riscos (WACC).'
            : 'O motor de valuation deste ativo vem do roteamento do backend.');

    const cores = {
        MUITO_BARATA: { bg:'#dcfce7', borda:'#16a34a', texto:'#15803d', emoji:'🟢🟢', label:'MUITO BARATA' },
        BARATA:       { bg:'#f0fdf4', borda:'#22c55e', texto:'#16a34a', emoji:'🟢',   label:'BARATA'       },
        JUSTA:        { bg:'#fefce8', borda:'#eab308', texto:'#854d0e', emoji:'🟡',   label:'JUSTA'        },
        CARA:         { bg:'#fff7ed', borda:'#f97316', texto:'#9a3412', emoji:'🟠',   label:'CARA'         },
        MUITO_CARA:   { bg:'#fef2f2', borda:'#dc2626', texto:'#991b1b', emoji:'🔴',   label:'MUITO CARA'   },
        SEM_DADOS:    { bg:'#f8fafc', borda:'#94a3b8', texto:'#475569', emoji:'⚪',   label:'SEM DADOS'    },
    };
    const sem = d.semaforo || 'SEM_DADOS';
    const c   = cores[sem] || cores.SEM_DADOS;

    const gordonModelRender = (d.modelos || []).find(m => m.nome.toUpperCase().includes('GORDON'));
    const waccFormatado = gordonModelRender && gordonModelRender.wacc_usado_pct !== undefined ? gordonModelRender.wacc_usado_pct : (d.taxa_desconto_pct || 12);
    const gFormatado = gordonModelRender && gordonModelRender.g_usado_pct !== undefined ? gordonModelRender.g_usado_pct : (d.g_perpetuidade_pct || 3);

    const precoRef = window.acaoAtiva.preco || window.acaoAtiva.preco_atual || 0;

    // ── Card Graham Clássico interativo ──
    const grahamModel = (d.modelos || []).find(m => m.nome.toUpperCase().includes('GRAHAM'));
    let cardGraham = '';
    if (grahamModel) {
        const grahamAplic = grahamModel.aplicavel;
        let grahamPj = grahamModel.preco_justo;
        let grahamUpside = grahamModel.upside_pct;
        if (grahamAplic && precoRef > 0) {
            grahamUpside = (grahamPj / precoRef - 1) * 100;
        }
        const grahamUpColor = grahamUpside > 0 ? 'var(--accent-green)' : grahamUpside < 0 ? 'var(--accent-red)' : 'var(--text-secondary)';
        cardGraham = `
            <div style="background:var(--bg-primary);border:1px solid var(--border-glass);border-radius:10px;padding:16px;min-width:0;">
                <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Graham Clássico</div>
                <div style="display:flex;align-items:flex-start;gap:10px;">
                    <div style="flex:1;min-width:0;">
                        ${grahamAplic ? `
                            <div id="graham-pj" style="font-size:22px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">R$ ${fmt(grahamPj)}</div>
                            <div id="graham-upside" style="font-size:14px;font-weight:600;color:${grahamUpColor};white-space:nowrap;">${grahamUpside > 0 ? '▲' : '▼'} ${grahamUpside > 0 ? '+' : '-'}${fmt(Math.abs(grahamUpside))}% ${grahamUpside >= 0 ? 'upside' : 'downside'}</div>
                        ` : `
                            <div id="graham-pj" style="font-size:22px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">N/A</div>
                            <div id="graham-upside" style="font-size:11px;color:var(--text-muted);margin-top:4px;white-space:nowrap;">${grahamModel.motivo_na || ''}</div>
                        `}
                    </div>
                    <div style="display:flex;gap:6px;flex-shrink:0;margin-top:-15px;">
                        <div style="text-align:center;">
                            <div style="font-size:9px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px;">VALOR</div>
                            <input id="graham-val" type="number" step="0.1" min="1" max="999" value="22.5" 
                                style="width:80px;padding:4px 4px;border:1px solid var(--border-glass);border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:13px;font-weight:600;text-align:center;outline:none;"
                                oninput="recalcularGrahamLocal()">
                        </div>
                    </div>
                </div>
            </div>`;
    }

    // ── Card Bazin interativo com inputs de Taxa e DPA MÉDIO ──
    const bazinModel = (d.modelos || []).find(m => m.nome.toUpperCase().includes('BAZIN'));
    // DPA MÉDIO = DY Médio × Preço (calculado no serviço da ficha; nas units, por unit — P-UNIT-DIV-01)
    const _acaoRef = window.acaoAtiva || {};
    const bazinDpa = _acaoRef.dpa_media || d.dpa_usado || _acaoRef.dpa || 0;
    const bazinTaxa = 6;
    // Recalcular Bazin já com o DPA MÉDIO (evita duplo update visual)
    let bazinPj = 0;
    let bazinUpside = 0;
    const bazinAplic = bazinDpa > 0;
    if (bazinAplic) {
        bazinPj = bazinDpa / (bazinTaxa / 100);
        bazinUpside = precoRef > 0 ? (bazinPj / precoRef - 1) * 100 : 0;
    }
    const bazinUpColor = bazinUpside > 0 ? 'var(--accent-green)' : bazinUpside < 0 ? 'var(--accent-red)' : 'var(--text-secondary)';

    const cardBazin = `
        <div style="background:var(--bg-primary);border:1px solid var(--border-glass);border-radius:10px;padding:16px;min-width:0;grid-column:span 1;">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">BAZIN</div>
            <div style="display:flex;align-items:flex-start;gap:10px;">
                <div style="flex:1;min-width:0;">
                    ${bazinAplic ? `
                        <div id="bazin-pj" style="font-size:22px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">R$ ${fmt(bazinPj)}</div>
                        <div id="bazin-upside" style="font-size:14px;font-weight:600;color:${bazinUpColor};white-space:nowrap;">${bazinUpside > 0 ? '▲' : '▼'} ${bazinUpside > 0 ? '+' : '-'}${fmt(Math.abs(bazinUpside))}% ${bazinUpside >= 0 ? 'upside' : 'downside'}</div>
                    ` : `
                        <div style="font-size:13px;color:var(--text-muted);font-style:italic;">N/A</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${bazinModel ? bazinModel.motivo_na || '' : ''}</div>
                    `}
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;margin-top:-15px;">
                    <div style="text-align:center;">
                        <div style="font-size:9px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px;height:14px;display:flex;align-items:center;justify-content:center;">TAXA %</div>
                        <input id="bazin-taxa" type="number" step="0.1" min="1" max="20" value="${bazinTaxa}" 
                            style="width:52px;padding:4px 4px;border:1px solid var(--border-glass);border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:13px;font-weight:600;text-align:center;outline:none;"
                            oninput="recalcularBazin()">
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:9px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px;height:14px;display:flex;align-items:center;justify-content:center;">
                            <span class="tooltip-wrapper">
                                <span class="tooltip-text-dotted" style="text-decoration: underline dotted var(--text-muted);">DPA MÉDIO R$</span>
                                <span style="display:inline-flex; align-items:center; justify-content:center; width:12px; height:12px; border-radius:50%; background:var(--bg-secondary); border:1px solid var(--text-muted); font-size:8px; margin-left:3px; color:var(--text-muted); cursor:help; font-weight:bold; position:relative; top:0;">?</span>
                                <span class="tooltip-box" style="text-transform:none; font-weight:normal; letter-spacing:normal;">Dividendos Médios Pagos por Ação ou Dividendos por Ação Projetados</span>
                            </span>
                        </div>
                        <input id="bazin-dpa" type="number" step="0.01" min="0" max="999" value="${bazinDpa.toFixed(2)}" 
                            style="width:80px;padding:4px 4px;border:1px solid var(--border-glass);border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:13px;font-weight:600;text-align:center;outline:none;"
                            oninput="recalcularBazin()">
                    </div>
                </div>
            </div>
        </div>`;

    // ── Card Gordon Growth (DDM) ──
    const gordonModel = (d.modelos || []).find(m => m.nome.toUpperCase().includes('GORDON'));
    let cardGordon = '';
    if (gordonModel && !ocultarGordon) {
        const gordonAplic = bazinDpa > 0 && gordonModel.aplicavel;
        // Recalcular Gordon já com DPA MÉDIO
        const _gPct = gordonModel.g_usado_pct !== undefined ? gordonModel.g_usado_pct : (d.g_perpetuidade_pct || 3);
        const _kPct = gordonModel.wacc_usado_pct !== undefined ? gordonModel.wacc_usado_pct : (d.taxa_desconto_pct || 12);
        let gordonPj = gordonModel.preco_justo || 0;
        let gordonUpside = gordonModel.upside_pct || 0;
        if (gordonAplic && bazinDpa > 0 && _kPct > _gPct && _kPct > 0) {
            gordonPj = bazinDpa * (1 + _gPct / 100) / ((_kPct - _gPct) / 100);
            gordonUpside = precoRef > 0 ? (gordonPj / precoRef - 1) * 100 : 0;
        }
        const gordonUpColor = gordonUpside > 0 ? 'var(--accent-green)' : gordonUpside < 0 ? 'var(--accent-red)' : 'var(--text-secondary)';
        cardGordon = `
            <div style="background:var(--bg-primary);border:1px solid var(--border-glass);border-radius:10px;padding:16px;min-width:0;">
                <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Gordon (DDM)</div>
                <div style="display:flex;align-items:flex-start;gap:10px;">
                    <div style="flex:1;min-width:0;">
                        ${gordonAplic ? `
                            <div id="gordon-pj" style="font-size:22px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">R$ ${fmt(gordonPj)}</div>
                            <div id="gordon-upside" style="font-size:14px;font-weight:600;color:${gordonUpColor};white-space:nowrap;">${gordonUpside > 0 ? '▲' : '▼'} ${gordonUpside > 0 ? '+' : '-'}${fmt(Math.abs(gordonUpside))}% ${gordonUpside >= 0 ? 'upside' : 'downside'}</div>
                        ` : `
                            <div id="gordon-pj" style="font-size:22px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">N/A</div>
                            <div id="gordon-upside" style="font-size:11px;color:var(--text-muted);margin-top:4px;white-space:nowrap;">${gordonModel.motivo_na || ''}</div>
                        `}
                    </div>
                    <div style="display:flex;gap:6px;flex-shrink:0;margin-top:-15px;">
                        <div style="text-align:center;">
                            <div style="font-size:9px;font-weight:600;color:var(--text-muted);letter-spacing:.3px;margin-bottom:3px;height:14px;display:flex;align-items:center;justify-content:center;">CRESCIMENTO(g)%</div>
                            <input id="gordon-g" type="number" step="0.1" min="0" max="20" value="${gFormatado}" 
                                style="width:52px;padding:4px 4px;border:1px solid var(--border-glass);border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:13px;font-weight:600;text-align:center;outline:none;"
                                oninput="recalcularGordonLocal()">
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:9px;font-weight:600;color:var(--text-muted);letter-spacing:.3px;margin-bottom:3px;height:14px;display:flex;align-items:center;justify-content:center;">
                                <span class="tooltip-wrapper">
                                    <span class="tooltip-text-dotted" style="text-decoration: underline dotted var(--text-muted);">${isBancoOuSeguro ? 'Ke%' : 'WACC%'}</span>
                                    <span style="display:inline-flex; align-items:center; justify-content:center; width:12px; height:12px; border-radius:50%; background:var(--bg-secondary); border:1px solid var(--text-muted); font-size:8px; margin-left:3px; color:var(--text-muted); cursor:help; font-weight:bold; position:relative; top:0;">?</span>
                                    <span class="tooltip-box" style="text-transform:none; font-weight:normal; letter-spacing:normal; width:220px; white-space:normal; text-align:left;">${isBancoOuSeguro ? 'Custo do Capital Próprio (Ke). É o retorno mínimo exigido pelos acionistas para investir na empresa.' : 'Custo Médio Ponderado de Capital (WACC). Representa o custo médio que a empresa paga para captar dinheiro, seja de acionistas ou empréstimos. Funciona como a taxa mínima de retorno que o mercado espera.'}</span>
                                </span>
                            </div>
                            <input id="gordon-k" type="number" step="0.1" min="0" max="30" value="${waccFormatado}" 
                                style="width:52px;padding:4px 4px;border:1px solid var(--border-glass);border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:13px;font-weight:600;text-align:center;outline:none;"
                                oninput="recalcularGordonLocal()">
                        </div>
                    </div>
                </div>
            </div>`;
    }

    const rawDcfCustom = isPatrimonio
        ? (window.ValuationPatrimonioV1 && typeof window.ValuationPatrimonioV1.getCardResult === 'function'
            ? window.ValuationPatrimonioV1.getCardResult(ticker)
            : null)
        : (window.ValuationFcffV1 && typeof window.ValuationFcffV1.getCardResult === 'function'
            ? window.ValuationFcffV1.getCardResult(ticker)
            : null);
    const dcfCustom = normalizeValuationCardResult(rawDcfCustom);
    let cardDcf = '';
    if (dcfCustom) {
        const upColor = dcfCustom.upside > 0 ? 'var(--accent-green)' : dcfCustom.upside < 0 ? 'var(--accent-red)' : 'var(--text-secondary)';
        cardDcf = `
            <div style="background:var(--bg-primary);border:2px solid var(--accent-yellow);border-radius:10px;padding:16px;min-width:0;position:relative;">
                <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">
                    <span class="tooltip-wrapper">
                        <span class="tooltip-text-dotted" style="text-decoration: underline dotted var(--text-muted);">${termVal}</span>
                        <span style="display:inline-flex; align-items:center; justify-content:center; width:14px; height:14px; border-radius:50%; background:var(--bg-secondary); border:1px solid var(--text-muted); font-size:9px; margin-left:4px; color:var(--text-muted); cursor:help; font-weight:bold; position:relative; top:-6px;">?</span>
                        <span class="tooltip-box" style="text-transform:none; font-weight:normal; letter-spacing:normal;">${hintVal}</span>
                    </span> &nbsp;${ticker}
                </div>
                <div style="display:flex;align-items:flex-start;gap:10px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:22px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">R$ ${fmt(dcfCustom.preco)}</div>
                        ${dcfCustom.semValorPositivo
                            ? `<div class="valuation-card-aviso" style="font-size:12px;font-weight:600;color:var(--accent-red);" title="Neste cenário, a dívida líquida e os ajustes superam o valor da operação. Não é um preço justo.">⚠ Dívida maior que o valor da operação</div>`
                            : `<div style="font-size:14px;font-weight:600;color:${upColor};white-space:nowrap;">${dcfCustom.upside > 0 ? '▲' : '▼'} ${dcfCustom.upside > 0 ? '+' : '-'}${fmt(Math.abs(dcfCustom.upside * 100))}% ${dcfCustom.upside >= 0 ? 'upside' : 'downside'}</div>`}
                    </div>
                    <div style="flex-shrink:0;">
                        <button onclick="abrirModalValuation('${ticker}')" class="btn-comparador">
                            Calcular VALUATION
                        </button>
                    </div>
                </div>
                <a href="#" onclick="abrirManualDoMotor(); return false;" title="Manual do Valuation: como funciona o ${termVal}" style="position:absolute; top:8px; right:8px; font-size:11px; font-weight:bold; background:var(--accent-blue); color:#fff; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; text-decoration:none; box-shadow:0 1px 3px rgba(0,0,0,0.2); z-index:10;">?</a>
            </div>
        `;
    } else {
        cardDcf = `
            <div style="background:var(--bg-primary);border:1px solid var(--border-glass);border-radius:10px;padding:16px;min-width:0;position:relative;">
                <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">
                    <span class="tooltip-wrapper">
                        <span class="tooltip-text-dotted" style="text-decoration: underline dotted var(--text-muted);">${termVal}</span>
                        <span class="tooltip-box" style="text-transform:none; font-weight:normal; letter-spacing:normal;">${hintVal}</span>
                    </span> &nbsp;${ticker}
                </div>
                <div style="display:flex;align-items:flex-start;gap:10px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:14px;color:var(--text-muted);font-style:italic;margin-top:4px;">Não calculado</div>
                    </div>
                    <div style="flex-shrink:0;">
                        <button onclick="abrirModalValuation('${ticker}')" class="btn-comparador">
                            Calcular VALUATION
                        </button>
                    </div>
                </div>
                <a href="#" onclick="abrirManualDoMotor(); return false;" title="Manual do Valuation: como funciona o ${termVal}" style="position:absolute; top:8px; right:8px; font-size:11px; font-weight:bold; background:var(--accent-blue); color:#fff; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; text-decoration:none; box-shadow:0 1px 3px rgba(0,0,0,0.2); z-index:10;">?</a>
            </div>
        `;
    }

    // Armazenar precoRef para uso no recálculo do Bazin
    window._bazinPrecoRef = precoRef;

    const bazinTaxaAtual = parseFloat(document.getElementById('bazin-taxa')?.value) || bazinTaxa;

    container.innerHTML = `
        <div style="background:var(--bg-secondary);border:1px solid var(--border-glass);border-left:4px solid #f59e0b;border-radius:12px;padding:24px;margin-bottom:0;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;">
                ${cardGraham}
                ${cardBazin}
                ${cardGordon}
                ${cardDcf}
            </div>

            <div style="font-size:11px;color:var(--text-muted);border-top:1px dashed var(--border-glass);padding-top:10px;line-height:1.5;">
                <strong>Metodologia:</strong>
                Graham = √(VALOR×LPA×VPA) &nbsp;|&nbsp;
                Bazin = DPA / TAXA%${ocultarGordon ? '' : ` &nbsp;|&nbsp;
                Gordon = DPA×(1+g) / (${isBancoOuSeguro ? 'Ke' : 'WACC'} − g)`}
            </div>
        </div>
    `;

    // Salvar o cache do objeto d original caso a gente precise renderizar de novo (quando fecha modal)
    window.acaoAtiva.valuation_data = d;
}

function recalcularValuation(ticker) {
    // Essa função será mantida para caso ainda tenhamos algum override posterior (atualmente sem uso na nova interface)
    // Mas não é mais chamada pelos sliders.
}

window.recalcularBazin = function() {
    const taxaEl = document.getElementById('bazin-taxa');
    const dpaEl  = document.getElementById('bazin-dpa');
    const pjEl   = document.getElementById('bazin-pj');
    const upEl   = document.getElementById('bazin-upside');
    if (!taxaEl || !dpaEl || !pjEl) return;

    const taxa = parseFloat(taxaEl.value) || 6;
    const dpa  = parseFloat(dpaEl.value)  || 0;
    const preco = window._bazinPrecoRef   || 0;

    if (dpa <= 0 || taxa <= 0) {
        pjEl.textContent = 'N/A';
        if (upEl) upEl.textContent = '';
        if (window.recalcularGordonLocal) window.recalcularGordonLocal();
        return;
    }

    const pj = dpa / (taxa / 100);
    const upside = preco > 0 ? (pj / preco - 1) * 100 : 0;
    const upColor = upside > 0 ? 'var(--accent-green)' : upside < 0 ? 'var(--accent-red)' : 'var(--text-secondary)';

    pjEl.textContent = `R$ ${fmt(pj)}`;
    if (upEl) {
        upEl.style.color = upColor;
        upEl.textContent = `${upside > 0 ? '▲' : '▼'} ${upside > 0 ? '+' : '-'}${fmt(Math.abs(upside))}% ${upside >= 0 ? 'upside' : 'downside'}`;
    }

    // Sincronizar o recálculo do Gordon se o DPA mudar
    if (window.recalcularGordonLocal) {
        window.recalcularGordonLocal();
    }
};

window.recalcularGordonLocal = function() {
    const gEl  = document.getElementById('gordon-g');
    const kEl  = document.getElementById('gordon-k');
    const pjEl = document.getElementById('gordon-pj');
    const upEl = document.getElementById('gordon-upside');
    if (!gEl || !kEl || !pjEl) return;

    const g = parseFloat(gEl.value) || 0;
    const k = parseFloat(kEl.value) || 0;
    const dpa = parseFloat(document.getElementById('bazin-dpa')?.value) || (window.acaoAtiva ? window.acaoAtiva.dpa : 0) || 0;
    const preco = window._bazinPrecoRef || 0;

    if (dpa <= 0 || k <= g || k <= 0) {
        pjEl.textContent = 'N/A';
        if (upEl) {
            upEl.style.color = 'var(--text-muted)';
            if (k <= g && k > 0) {
                upEl.textContent = 'Taxa ≤ Cresc.';
            } else {
                upEl.textContent = 'Premissas inválidas';
            }
        }
        return;
    }

    const pj = dpa * (1 + g / 100) / ((k - g) / 100);
    const upside = preco > 0 ? (pj / preco - 1) * 100 : 0;
    const upColor = upside > 0 ? 'var(--accent-green)' : upside < 0 ? 'var(--accent-red)' : 'var(--text-secondary)';

    pjEl.textContent = `R$ ${fmt(pj)}`;
    if (upEl) {
        upEl.style.color = upColor;
        upEl.textContent = `${upside > 0 ? '▲' : '▼'} ${upside > 0 ? '+' : '-'}${fmt(Math.abs(upside))}% ${upside >= 0 ? 'upside' : 'downside'}`;
    }
};

window.recalcularGrahamLocal = function() {
    const valEl = document.getElementById('graham-val');
    const pjEl  = document.getElementById('graham-pj');
    const upEl  = document.getElementById('graham-upside');
    if (!valEl || !pjEl) return;

    const valor = parseFloat(valEl.value) || 22.5;
    const lpa   = window.acaoAtiva ? window.acaoAtiva.lpa : 0;
    const vpa   = window.acaoAtiva ? window.acaoAtiva.vpa : 0;
    const preco = window._bazinPrecoRef || 0;

    if (lpa <= 0 || vpa <= 0 || valor <= 0) {
        pjEl.textContent = 'N/A';
        if (upEl) {
            upEl.style.color = 'var(--text-muted)';
            upEl.textContent = 'LPA/VPA negativo';
        }
        return;
    }

    const pj = Math.sqrt(valor * lpa * vpa);
    const upside = preco > 0 ? (pj / preco - 1) * 100 : 0;
    const upColor = upside > 0 ? 'var(--accent-green)' : upside < 0 ? 'var(--accent-red)' : 'var(--text-secondary)';

    pjEl.textContent = `R$ ${fmt(pj)}`;
    if (upEl) {
        upEl.style.color = upColor;
        upEl.textContent = `${upside > 0 ? '▲' : '▼'} ${upside > 0 ? '+' : '-'}${fmt(Math.abs(upside))}% ${upside >= 0 ? 'upside' : 'downside'}`;
    }
};

// ====================== MODAL DCF MASTER ======================
let isDraggingDcfModal = false;
let dcfDragStartX = 0, dcfDragStartY = 0;
let dcfCurrentX = 0, dcfCurrentY = 0;

window.abrirModalValuation = async function(ticker) {
    if (!window.acaoAtiva) return;

    // Paywall: bloqueia recálculo para gratuitos (trial expirado)
    const _userPlano = localStorage.getItem('user_plano');
    const _userPlanoId = parseInt(localStorage.getItem('user_plano_id'));
    const _isTrial = localStorage.getItem('is_trial') === 'true';
    const _isAdmin = localStorage.getItem('is_admin') === 'true';
    const _isPremium = _userPlano === 'Premium' || _userPlanoId === 9 || _isAdmin;
    if (!_isPremium && !_isTrial) {
        const evt = window.event;
        const btnCalc = (evt && evt.target) ? evt.target.closest('.btn-comparador') : document.querySelector('#valuation-container .btn-comparador');
        mostrarToastPremium('O acesso ao botão Cálculo de VALUATION é exclusivo Premium.', btnCalc);
        return;
    }
    
    // P-PATR-01 F3-D6: o motor vem do roteamento do banco de dados, não do nome do segmento.
    const modalBg = document.getElementById('modal-dcf-master');
    const modalBody = document.getElementById('modal-dcf-body');
    const modalTitle = document.querySelector('#modal-dcf-header h3');
    const semMotorAnterior = document.getElementById('dcf-sem-motor-msg');
    if (semMotorAnterior) semMotorAnterior.remove();
    let route = null;
    let falhaRota = null;
    try {
        const resp = await fetch(`/api/v1/valuation/route/${encodeURIComponent(ticker)}`);
        if (resp.ok) route = await resp.json();
        else falhaRota = { tipo: 'http', status: resp.status };
    } catch (err) {
        falhaRota = { tipo: 'rede' };
    }
    const modal = route && route.modal ? route.modal : 'ERRO_ROTEAMENTO';
    window.acaoAtiva.valuation_route = route;
    window.acaoAtiva.valuationModal = modal;

    if (modal === 'PATRIMONIO_V1') {
        if (modalTitle && window.ValuationPatrimonioV1) modalTitle.textContent = window.ValuationPatrimonioV1.titleForAdapter(route && route.adapter);
        const formBancos = document.getElementById('val-bancos-content');
        if (formBancos) modalBody.appendChild(formBancos);
        if (window.ValuationPatrimonioV1) window.ValuationPatrimonioV1.open(ticker);
    } else if (modal === 'FCFF_V1') {
        const formEmpresas = document.getElementById('val-empresas-content');
        if (formEmpresas) modalBody.appendChild(formEmpresas);
        if (modalTitle) modalTitle.textContent = '📊 Valuation FCFF V1';
        if (window.ValuationFcffV1) window.ValuationFcffV1.open(ticker);
    } else {
        if (modalTitle) modalTitle.textContent = 'Valuation';
        const aviso = document.createElement('div');
        aviso.id = 'dcf-sem-motor-msg';
        aviso.className = 'fcff-inline-warning';
        if (route) {
            aviso.textContent = route.message || 'Não foi possível identificar o motor de valuation deste ticker.';
        } else {
            const falha = falhaRotaValuation(falhaRota);
            const texto = document.createElement('span');
            texto.textContent = falha.mensagem;
            aviso.appendChild(texto);
            if (falha.tentarDeNovo) {
                const botao = document.createElement('button');
                botao.type = 'button';
                botao.className = 'btn-comparador';
                botao.style.marginLeft = '8px';
                botao.textContent = 'Tentar de novo';
                botao.addEventListener('click', () => window.abrirModalValuation(ticker));
                aviso.appendChild(botao);
            }
        }
        modalBody.appendChild(aviso);
    }

    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([modalBody]).catch(err => console.log('MathJax error:', err));
    }
    
    modalBg.style.display = 'flex';
}

// P-PORTAL-01: ticker do FCFF digitado na tela de patrimônio → "Abrir no FCFF" troca para a tela do FCFF (no modal, troca o
// formulário; na página do menu, navega para a página do FCFF).
window.abrirTelaFcff = function(ticker) {
    const modalBody = document.getElementById('modal-dcf-body');
    const formBancos = document.getElementById('val-bancos-content');
    if (!modalBody || !formBancos || formBancos.parentElement !== modalBody) {
        navegarPara('valuation_empresas', ticker);
        return;
    }
    const paginaBancos = document.getElementById('pagina-valuation-bancos');
    if (paginaBancos) paginaBancos.appendChild(formBancos);
    const formEmpresas = document.getElementById('val-empresas-content');
    if (formEmpresas) modalBody.appendChild(formEmpresas);
    const modalTitle = document.querySelector('#modal-dcf-header h3');
    if (modalTitle) modalTitle.textContent = '📊 Valuation FCFF V1';
    if (window.acaoAtiva) window.acaoAtiva.valuationModal = 'FCFF_V1';
    if (window.ValuationFcffV1) window.ValuationFcffV1.open(ticker);
};

// 14/10/2026: o inverso — ticker de banco, imobiliária ou seguradora digitado no FCFF → "Abrir no motor de patrimônio" (no modal,
// troca o formulário; o título vem da rota, pela tela de patrimônio; na página do menu, navega para a página de bancos).
window.abrirTelaPatrimonio = function(ticker) {
    const modalBody = document.getElementById('modal-dcf-body');
    const formEmpresas = document.getElementById('val-empresas-content');
    if (!modalBody || !formEmpresas || formEmpresas.parentElement !== modalBody) {
        navegarPara('valuation_bancos', ticker);
        return;
    }
    const paginaEmpresas = document.getElementById('pagina-valuation-empresas');
    if (paginaEmpresas) paginaEmpresas.appendChild(formEmpresas);
    const formBancos = document.getElementById('val-bancos-content');
    if (formBancos) modalBody.appendChild(formBancos);
    if (window.acaoAtiva) window.acaoAtiva.valuationModal = 'PATRIMONIO_V1';
    if (window.ValuationPatrimonioV1) window.ValuationPatrimonioV1.open(ticker);
};

window.fecharModalValuation = function() {
    const modalBg = document.getElementById('modal-dcf-master');
    const modalBody = document.getElementById('modal-dcf-body');
    
    // Devolver o formulário ao lugar original (P-PATR-01 F3: sem cálculo em JS ao fechar).
    const modalAtivo = window.acaoAtiva ? window.acaoAtiva.valuationModal : null;
    if (modalAtivo === 'PATRIMONIO_V1') {
        const formBancos = document.getElementById('val-bancos-content');
        const containerOriginal = document.getElementById('pagina-valuation-bancos');
        if (formBancos && containerOriginal) containerOriginal.appendChild(formBancos);
    } else {
        const formEmpresas = document.getElementById('val-empresas-content');
        const containerOriginal = document.getElementById('pagina-valuation-empresas');
        if (formEmpresas && containerOriginal) containerOriginal.appendChild(formEmpresas);
    }
    const semMotor = document.getElementById('dcf-sem-motor-msg');
    if (semMotor) semMotor.remove();
    
    modalBg.style.display = 'none';
    
    // Resetar a posição do modal
    const modalWindow = document.getElementById('modal-dcf-window');
    if (modalWindow) {
        modalWindow.style.transform = 'none';
        dcfCurrentX = 0;
        dcfCurrentY = 0;
    }
    
    // Reconsulta o resultado vigente no controlador (FCFF V1 ou patrimônio) ao fechar o modal.
    refreshCurrentValuationCard(window, document, renderizarValuation);
}

// Configurar o Drag & Drop do Modal DCF usando transform
document.addEventListener('mousedown', function (e) {
    if (e.target && e.target.closest('#modal-dcf-header')) {
        isDraggingDcfModal = true;
        dcfDragStartX = e.clientX - dcfCurrentX;
        dcfDragStartY = e.clientY - dcfCurrentY;
        document.body.style.userSelect = 'none';
    }
});

document.addEventListener('mousemove', function (e) {
    if (isDraggingDcfModal) {
        dcfCurrentX = e.clientX - dcfDragStartX;
        dcfCurrentY = e.clientY - dcfDragStartY;
        const modal = document.getElementById('modal-dcf-window');
        if (modal) {
            modal.style.transform = `translate(${dcfCurrentX}px, ${dcfCurrentY}px)`;
        }
    }
});

document.addEventListener('mouseup', function (e) {
    if (isDraggingDcfModal) {
        isDraggingDcfModal = false;
        document.body.style.userSelect = '';
    }
});

// Drag & Drop do Modal Cenarios
let isDraggingCenariosModal = false;
let cenariosCurrentX = 0;
let cenariosCurrentY = 0;
let cenariosDragStartX = 0;
let cenariosDragStartY = 0;

document.addEventListener('mousedown', function (e) {
    if (e.target && e.target.closest('#modal-cenarios-header')) {
        isDraggingCenariosModal = true;
        cenariosDragStartX = e.clientX - cenariosCurrentX;
        cenariosDragStartY = e.clientY - cenariosCurrentY;
        document.body.style.userSelect = 'none';
        document.getElementById('modal-cenarios-header').style.cursor = 'grabbing';
    }
});

document.addEventListener('mousemove', function (e) {
    if (isDraggingCenariosModal) {
        cenariosCurrentX = e.clientX - cenariosDragStartX;
        cenariosCurrentY = e.clientY - cenariosDragStartY;
        const modal = document.getElementById('modal-cenarios-window');
        if (modal) {
            modal.style.transform = `translate(calc(-50% + ${cenariosCurrentX}px), calc(-50% + ${cenariosCurrentY}px))`;
        }
    }
});

document.addEventListener('mouseup', function (e) {
    if (isDraggingCenariosModal) {
        isDraggingCenariosModal = false;
        document.body.style.userSelect = '';
        const header = document.getElementById('modal-cenarios-header');
        if (header) header.style.cursor = 'grab';
    }
});

// Drag & Drop do Modal Graficos Cenarios
let isDraggingGraficosCenariosModal = false;
let graficosCenariosCurrentX = 0;
let graficosCenariosCurrentY = 0;
let graficosCenariosDragStartX = 0;
let graficosCenariosDragStartY = 0;

document.addEventListener('mousedown', function (e) {
    if (e.target && e.target.closest('#modal-graficos-cenarios-header')) {
        isDraggingGraficosCenariosModal = true;
        graficosCenariosDragStartX = e.clientX - graficosCenariosCurrentX;
        graficosCenariosDragStartY = e.clientY - graficosCenariosCurrentY;
        document.body.style.userSelect = 'none';
        const header = document.getElementById('modal-graficos-cenarios-header');
        if (header) header.style.cursor = 'grabbing';
    }
});

document.addEventListener('mousemove', function (e) {
    if (isDraggingGraficosCenariosModal) {
        graficosCenariosCurrentX = e.clientX - graficosCenariosDragStartX;
        graficosCenariosCurrentY = e.clientY - graficosCenariosDragStartY;
        const modal = document.getElementById('modal-graficos-cenarios-window');
        if (modal) {
            modal.style.transform = `translate(calc(-50% + ${graficosCenariosCurrentX}px), calc(-50% + ${graficosCenariosCurrentY}px))`;
        }
    }
});

document.addEventListener('mouseup', function (e) {
    if (isDraggingGraficosCenariosModal) {
        isDraggingGraficosCenariosModal = false;
        document.body.style.userSelect = '';
        const header = document.getElementById('modal-graficos-cenarios-header');
        if (header) header.style.cursor = 'grab';
    }
});

// ====================== MANUAL CENARIOS ======================
let cacheMdCenarios = null;

async function abrirModalCenarios(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const modal = document.getElementById('modal-cenarios');
    if (modal) modal.style.display = 'block';

    const container = document.getElementById('cenarios-content');
    if (!container) return;

    try {
        if (!cacheMdCenarios) {
            container.innerHTML = '<div class="loading">Carregando cenários...</div>';
            const v = Date.now(); // Força cache clear
            const resp = await fetch('/static/docs/manual_cenarios.md?v=' + v);

            if (resp.ok) {
                cacheMdCenarios = await resp.text();
            } else {
                container.innerHTML = '<div style="color:var(--accent-red);">Erro ao carregar o manual de cenários. Verifique se o arquivo manual_cenarios.md existe na pasta static/docs.</div>';
                return;
            }
        }

        let conteudoHTML = `
            <style>
                .markdown-body p { margin-bottom: 1.2em; line-height: 1.6; text-align: justify; }
                .markdown-body ul { margin-bottom: 1.2em; padding-left: 20px; line-height: 1.6; }
                .markdown-body li { margin-bottom: 0.5em; }
                .markdown-body h2 { color: var(--accent-blue); border-bottom: 1px solid var(--border-glass); padding-bottom: 5px; margin-top: 1.5em; margin-bottom: 0.8em; }
                .markdown-body h3 { color: var(--primary-color); margin-top: 1.2em; margin-bottom: 0.6em; }
                .markdown-body h1 { color: var(--text-primary); margin-bottom: 1.2em; font-size: 1.8em; }
                .markdown-body table { width: 100%; border-collapse: collapse; margin: 1.5em 0; table-layout: fixed; }
                .markdown-body th, .markdown-body td { border: 1px solid var(--border-glass); padding: 10px 12px; text-align: left; white-space: normal; word-wrap: break-word; overflow-wrap: break-word; vertical-align: top; }
                .markdown-body th { background-color: var(--bg-card); color: var(--text-primary); font-weight: 600; }
                .markdown-body tr:nth-child(even) { background-color: rgba(255, 255, 255, 0.02); }
                
                /* Configurações para a primeira tabela (Cenários - 4 colunas) */
                .markdown-body table:first-of-type th:nth-child(1), .markdown-body table:first-of-type td:nth-child(1) { width: 22%; }
                .markdown-body table:first-of-type th:nth-child(2), .markdown-body table:first-of-type td:nth-child(2) { width: 20%; }
                .markdown-body table:first-of-type th:nth-child(3), .markdown-body table:first-of-type td:nth-child(3) { width: 43%; }
                .markdown-body table:first-of-type th:nth-child(4), .markdown-body table:first-of-type td:nth-child(4) { width: 15%; }
                
                /* Configurações para as tabelas seguintes (Pilares - 5 colunas) */
                .markdown-body table:not(:first-of-type) th:nth-child(1), .markdown-body table:not(:first-of-type) td:nth-child(1) { width: 18%; }
                .markdown-body table:not(:first-of-type) th:nth-child(2), .markdown-body table:not(:first-of-type) td:nth-child(2) { width: 18%; }
                .markdown-body table:not(:first-of-type) th:nth-child(3), .markdown-body table:not(:first-of-type) td:nth-child(3) { width: 12%; }
                .markdown-body table:not(:first-of-type) th:nth-child(4), .markdown-body table:not(:first-of-type) td:nth-child(4) { width: 12%; }
                .markdown-body table:not(:first-of-type) th:nth-child(5), .markdown-body table:not(:first-of-type) td:nth-child(5) { width: 40%; }
            </style>
            <div class="markdown-body" style="background:var(--bg-body); padding:20px; border-radius:8px;">
                ${marked.parse(cacheMdCenarios)}
            </div>
        `;
        
        container.innerHTML = conteudoHTML;

        // Renderiza fórmulas LaTeX se houver MathJax carregado
        if (window.MathJax) {
            MathJax.typesetPromise([container]).catch((err) => console.log('MathJax error:', err));
        }

    } catch (err) {
        console.error('Erro ao processar modal de cenários:', err);
        container.innerHTML = '<div style="color:var(--accent-red);">Erro interno ao carregar a explicação dos cenários.</div>';
    }
}

window.abrirModalCenarios = abrirModalCenarios;

// ====================== GRÁFICOS DE CENÁRIOS (BACKTEST) ======================
function abrirModalGraficosCenarios() {
    const modal = document.getElementById('modal-graficos-cenarios');
    if (modal) modal.style.display = 'block';

    const content = document.getElementById('graficos-cenarios-content');
    if (!content) return;

    // Coloca spinner de loading
    content.innerHTML = '<div class="loading">Carregando gráficos...</div>';

    // Cria as tags de imagem com cache buster para garantir que a versão mais recente gerada localmente apareça.
    const v = Date.now();
    content.innerHTML = `
        <!-- Gráfico Principal: Risco vs Retorno -->
        <div style="width: 100%; text-align: center; background: var(--bg-card); padding: 15px; border-radius: 8px; border: 1px solid var(--border-glass);">
            <h4 style="color: var(--accent-blue, #2563eb); margin-bottom: 15px; font-size: 15px; font-weight: 600;">
                📊 Gráfico Principal: Risco (Volatilidade) vs. Retorno Anualizado
            </h4>
            <img src="/static/graficos/grafico_risco_vs_retorno.png?v=${v}" style="max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);" alt="Gráfico Risco vs Retorno" onerror="this.onerror=null; this.src=''; this.parentNode.innerHTML='<div style=\\'color: var(--text-muted); padding: 20px;\\'>Gráfico Risco vs Retorno ainda não gerado. Execute o script de backtest para gerá-lo.</div>';">
        </div>
        
        <hr style="border: 0; border-top: 1px solid var(--border-glass); margin: 10px 0;">
        
        <!-- Outros 5 gráficos comparativos -->
        <div>
            <h4 style="color: var(--text-primary); margin-bottom: 15px; font-size: 15px; font-weight: 600; text-align: center;">
                📈 Gráficos de Métricas Comparativas
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(480px, 1fr)); gap: 20px;">
                <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; border: 1px solid var(--border-glass); text-align: center;">
                    <h5 style="color: var(--text-muted); margin-bottom: 10px; font-size: 13px; font-weight: 500;">Comparativo de Cenários: Retorno Anualizado (%)</h5>
                    <img src="/static/graficos/grafico_comparativo_Retorno_Anualizado.png?v=${v}" style="width: 100%; height: auto; border-radius: 6px;" alt="Retorno Anualizado" onerror="this.style.display='none'; this.parentNode.innerHTML+='<p style=\\'color: var(--text-muted); font-size: 12px;\\'>Gráfico não disponível.</p>';">
                </div>
                
                <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; border: 1px solid var(--border-glass); text-align: center;">
                    <h5 style="color: var(--text-muted); margin-bottom: 10px; font-size: 13px; font-weight: 500;">Comparativo de Cenários: Max Drawdown (%)</h5>
                    <img src="/static/graficos/grafico_comparativo_Max_Drawdown.png?v=${v}" style="width: 100%; height: auto; border-radius: 6px;" alt="Max Drawdown" onerror="this.style.display='none'; this.parentNode.innerHTML+='<p style=\\'color: var(--text-muted); font-size: 12px;\\'>Gráfico não disponível.</p>';">
                </div>
                
                <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; border: 1px solid var(--border-glass); text-align: center;">
                    <h5 style="color: var(--text-muted); margin-bottom: 10px; font-size: 13px; font-weight: 500;">Comparativo de Cenários: Sharpe Ratio</h5>
                    <img src="/static/graficos/grafico_comparativo_Sharpe_Ratio.png?v=${v}" style="width: 100%; height: auto; border-radius: 6px;" alt="Sharpe Ratio" onerror="this.style.display='none'; this.parentNode.innerHTML+='<p style=\\'color: var(--text-muted); font-size: 12px;\\'>Gráfico não disponível.</p>';">
                </div>
                
                <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; border: 1px solid var(--border-glass); text-align: center;">
                    <h5 style="color: var(--text-muted); margin-bottom: 10px; font-size: 13px; font-weight: 500;">Comparativo de Cenários: Sortino Ratio</h5>
                    <img src="/static/graficos/grafico_comparativo_Sortino_Ratio.png?v=${v}" style="width: 100%; height: auto; border-radius: 6px;" alt="Sortino Ratio" onerror="this.style.display='none'; this.parentNode.innerHTML+='<p style=\\'color: var(--text-muted); font-size: 12px;\\'>Gráfico não disponível.</p>';">
                </div>
                
                <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; border: 1px solid var(--border-glass); text-align: center;">
                    <h5 style="color: var(--text-muted); margin-bottom: 10px; font-size: 13px; font-weight: 500;">Comparativo de Cenários: Turnover Médio Trimestral (%)</h5>
                    <img src="/static/graficos/grafico_comparativo_Turnover_M&eacute;dio_Trimestral.png?v=${v}" style="width: 100%; height: auto; border-radius: 6px;" alt="Turnover Médio" onerror="this.style.display='none'; this.parentNode.innerHTML+='<p style=\\'color: var(--text-muted); font-size: 12px;\\'>Gráfico não disponível.</p>';">
                </div>
            </div>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--border-glass); margin: 15px 0;">

        <!-- Glossário de Métricas Comparativas -->
        <div style="background: var(--bg-card); padding: 20px; border-radius: 8px; border: 1px solid var(--border-glass); margin-top: 5px;">
            <h4 style="color: var(--accent-blue, #2563eb); margin-bottom: 15px; font-size: 15px; font-weight: 600; text-align: left; display: flex; align-items: center; gap: 8px;">
                📖 Guia Rápido: O que significam estas métricas de desempenho?
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; text-align: left;">
                <div style="background: rgba(255, 255, 255, 0.02); padding: 12px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.04);">
                    <h5 style="color: var(--text-primary); font-size: 13px; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">📉 Max Drawdown (%)</h5>
                    <p style="color: var(--text-muted); font-size: 12px; line-height: 1.4; margin: 0;">
                        Representa a <strong>maior queda histórica</strong> de pico a fundo que a carteira sofreu antes de se recuperar. É a principal medida para entender o pior cenário de perda temporária que o investidor precisaria tolerar.
                    </p>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.02); padding: 12px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.04);">
                    <h5 style="color: var(--text-primary); font-size: 13px; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">⚡ Sharpe Ratio</h5>
                    <p style="color: var(--text-muted); font-size: 12px; line-height: 1.4; margin: 0;">
                        Mede a <strong>relação risco-retorno</strong> da estratégia. Indica quanto retorno a carteira gera para cada unidade de risco assumida (volatilidade). Valores maiores que 1.0 são considerados bons, significando que o retorno justifica o risco.
                    </p>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.02); padding: 12px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.04);">
                    <h5 style="color: var(--text-primary); font-size: 13px; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">🛡️ Sortino Ratio</h5>
                    <p style="color: var(--text-muted); font-size: 12px; line-height: 1.4; margin: 0;">
                        Similar ao Sharpe, porém <strong>penaliza apenas a volatilidade de queda (ruim)</strong>, ignorando a volatilidade de alta (boa). É ideal para avaliar estratégias de dividendos estáveis, onde oscilações positivas não são um problema.
                    </p>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.02); padding: 12px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.04);">
                    <h5 style="color: var(--text-primary); font-size: 13px; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">🔄 Turnover Médio Trimestral (%)</h5>
                    <p style="color: var(--text-muted); font-size: 12px; line-height: 1.4; margin: 0;">
                        Indica o <strong>percentual médio de ativos alterados</strong> (compras e vendas) na carteira a cada rebalanceamento. Taxas menores refletem estratégias de menor custo operacional e maior foco em investimentos de longo prazo.
                    </p>
                </div>
            </div>
        </div>
    `;
}

function fecharModalGraficosCenarios() {
    const modal = document.getElementById('modal-graficos-cenarios');
    if (modal) modal.style.display = 'none';
}

window.abrirModalGraficosCenarios = abrirModalGraficosCenarios;
window.fecharModalGraficosCenarios = fecharModalGraficosCenarios;

// ====================== MANUAL DO MOTOR ======================
// O "?" do cartão do valuation na ficha abre o Manual do Valuation no capítulo do motor da empresa (roteamento),
// com o botão de voltar para a ficha. (O item "Metodologia" do menu saiu em 13/10/2026: o Manual o substitui.)
function abrirManualDoMotor() {
    let capitulo = 'empresas-fcff';
    let voltar = null;
    const fichaAberta = document.getElementById('pagina-ativo').style.display === 'block';
    if (fichaAberta && window.acaoAtiva && window.acaoAtiva.ticker) {
        const rota = valuationRouteModal(window.acaoAtiva);
        if (rota && window.ManualValuation) capitulo = window.ManualValuation.chapterForRoute(rota);
        voltar = {
            rotulo: 'Voltar para ' + window.acaoAtiva.ticker,
            acao: () => {
                navegarPara('ativo');
                document.querySelectorAll('.sidebar .nav-link').forEach((el) => el.classList.remove('active'));
            },
        };
    }
    navegarPara('manual', capitulo, document.getElementById('nav-manual'), { voltar });
}
window.abrirManualDoMotor = abrirManualDoMotor;

// =====================================================================
// COMPRADOR DE MÉTRICAS (COMPARAR INDICADORES)
// =====================================================================

const METRICAS_GRUPOS = {
    p_l: 'MULTIPLO',
    p_vpa: 'MULTIPLO',
    p_fcl: 'MULTIPLO',
    ev_ebit: 'MULTIPLO',
    ev_ebitda: 'MULTIPLO',
    peg_ratio: 'MULTIPLO',
    div_liq_ebit: 'MULTIPLO',
    div_liq_ebitda: 'MULTIPLO',
    div_liq_pl: 'MULTIPLO',
    div_bruta_pl: 'MULTIPLO',
    qualidade_lucro: 'MULTIPLO',

    roe: 'PERCENTUAL',
    roe_media: 'PERCENTUAL',
    roa: 'PERCENTUAL',
    margem: 'PERCENTUAL',
    margem_media: 'PERCENTUAL',
    fcl_yield: 'PERCENTUAL',
    roic: 'PERCENTUAL',
    roic_media: 'PERCENTUAL',
    roce: 'PERCENTUAL',
    roce_media: 'PERCENTUAL',
    dy: 'PERCENTUAL',
    dy_media: 'PERCENTUAL',
    payout: 'PERCENTUAL',
    payout_media: 'PERCENTUAL',
    payout_fcl: 'PERCENTUAL',
    payout_fcl_media: 'PERCENTUAL',
    earnings_yield: 'PERCENTUAL',
    earnings_yield_media: 'PERCENTUAL',
    margem_ebitda: 'PERCENTUAL',
    margem_ebitda_media: 'PERCENTUAL',
    div_liq_cagr: 'PERCENTUAL',
    div_geral_ativo: 'PERCENTUAL',
    lucro_liq_cagr: 'PERCENTUAL',
    rec_liq_cagr: 'PERCENTUAL',
    lpa_cagr: 'PERCENTUAL',
    vpa_cagr: 'PERCENTUAL',
    dpa_cagr: 'PERCENTUAL',
    pat_liq_cagr: 'PERCENTUAL',
    fcl_cagr: 'PERCENTUAL',
    ebit_cagr: 'PERCENTUAL',
    ebitda_cagr: 'PERCENTUAL',
    'endividamento%': 'PERCENTUAL',

    lpa: 'MONETARIO_UNITARIO',
    vpa: 'MONETARIO_UNITARIO',
    dpa: 'MONETARIO_UNITARIO',

    receita_liquida: 'MONETARIO_ABSOLUTO',
    lucro_liquido: 'MONETARIO_ABSOLUTO',
    patrimonio_liquido: 'MONETARIO_ABSOLUTO',
    ebitda: 'MONETARIO_ABSOLUTO',
    ebit: 'MONETARIO_ABSOLUTO',
    ativo_total: 'MONETARIO_ABSOLUTO',
    imobilizado: 'MONETARIO_ABSOLUTO',
    cdg: 'MONETARIO_ABSOLUTO',
    div_bruta: 'MONETARIO_ABSOLUTO',
    div_liq: 'MONETARIO_ABSOLUTO',
    disponibilidades: 'MONETARIO_ABSOLUTO',
    dividendos: 'MONETARIO_ABSOLUTO',
    fco: 'MONETARIO_ABSOLUTO',
    fci: 'MONETARIO_ABSOLUTO',
    fcf: 'MONETARIO_ABSOLUTO',
    capex: 'MONETARIO_ABSOLUTO',
    d_a: 'MONETARIO_ABSOLUTO',
    var_ncg: 'MONETARIO_ABSOLUTO',
    fcl: 'MONETARIO_ABSOLUTO',
    resultado_bruto: 'MONETARIO_ABSOLUTO',
    dividen_media: 'MONETARIO_ABSOLUTO',
    margem_fcl: 'PERCENTUAL',

    // Indicadores Bancários
    indice_basileia: 'PERCENTUAL',
    indice_imobilizacao: 'PERCENTUAL',
    custo_do_risco: 'PERCENTUAL',
    indice_eficiencia: 'PERCENTUAL',
    indice_credito_captacoes: 'PERCENTUAL',
    carteira_credito: 'MONETARIO_ABSOLUTO',
    captacoes: 'MONETARIO_ABSOLUTO',
    tvm: 'MONETARIO_ABSOLUTO',
    pcld: 'MONETARIO_ABSOLUTO'
};

const METRICAS_LABELS = {
    p_l: 'P/L',
    p_vpa: 'P/VPA',
    p_fcl: 'P/FCL',
    fcl_yield: 'FCL Yield',
    ev_ebit: 'EV/EBIT',
    ev_ebitda: 'EV/EBITDA',
    peg_ratio: 'PEG Ratio',
    div_liq_ebit: 'Dív.Líq/EBIT',
    div_liq_ebitda: 'Dív.Líq/EBITDA',
    div_liq_pl: 'Dív.Líq/PL',
    qualidade_lucro: 'Qualidade do Lucro',
    roe: 'ROE',
    roe_media: 'ROE Média',
    roa: 'ROA',
    margem: 'Margem',
    margem_media: 'Margem Média',
    roic: 'ROIC',
    roic_media: 'ROIC Média',
    roce: 'ROCE',
    roce_media: 'ROCE Média',
    dy: 'Dividend Yield',
    dy_media: 'DY Média',
    dpa: 'DPA',
    payout: 'Payout',
    payout_media: 'Payout Médio',
    payout_fcl: 'Payout de FCL',
    payout_fcl_media: 'Payout de FCL Médio',
    earnings_yield: 'Rendimento dos Lucros',
    earnings_yield_media: 'Rendimento dos Lucros Médio',
    margem_ebitda: 'Margem EBITDA',
    margem_ebitda_media: 'Margem EBITDA Média',
    div_liq_cagr: 'Dív. Líquida CAGR',
    div_bruta_pl: 'Dív. Bruta/PL',
    div_geral_ativo: 'Dívida Geral/Ativo',
    dividendos: 'Total Pago no Ano',
    lucro_liq_cagr: 'Lucro CAGR',
    rec_liq_cagr: 'Receita CAGR',
    lpa_cagr: 'LPA CAGR',
    vpa_cagr: 'VPA CAGR',
    dpa_cagr: 'DPA CAGR',
    pat_liq_cagr: 'PL CAGR',
    fcl_cagr: 'FCL CAGR',
    ebit_cagr: 'EBIT CAGR',
    ebitda_cagr: 'EBITDA CAGR',
    'endividamento%': 'Endividamento %',
    lpa: 'LPA',
    vpa: 'VPA',
    receita_liquida: 'Receita Líquida',
    lucro_liquido: 'Lucro Líquido',
    patrimonio_liquido: 'Patr. Líquido',
    ebitda: 'EBITDA',
    ebit: 'EBIT',
    ativo_total: 'Ativo Total',
    imobilizado: 'Imobilizado',
    cdg: 'Capital de Giro',
    div_bruta: 'Dívida Bruta',
    div_liq: 'Dívida Líquida',
    disponibilidades: 'Disponibilidades',
    fco: 'FCO',
    fci: 'FCI',
    fcf: 'FCF',
    capex: 'CAPEX',
    d_a: 'Depreciação/Amort.',
    var_ncg: 'Variação NCG',
    resultado_bruto: 'Resultado Bruto',
    fcl: 'FCL',
    margem_fcl: 'Margem de FCL',
    dividen_media: 'Dividendo Médio Pago',

    // Indicadores Bancários
    indice_basileia: 'Índice Basileia',
    indice_imobilizacao: 'Imobilização',
    custo_do_risco: 'Custo do Risco',
    indice_eficiencia: 'Eficiência',
    indice_credito_captacoes: 'Créd/Captações',
    carteira_credito: 'Carteira de Crédito',
    captacoes: 'Captações',
    tvm: 'TVM',
    pcld: 'PCLD'
};

let isDraggingComparadorModal = false;
let comparadorDragStartX = 0, comparadorDragStartY = 0;
let comparadorCurrentX = 0, comparadorCurrentY = 0;

window.abrirModalComparador = function() {
    if (!window.acaoAtiva) {
        alert("Nenhuma ação selecionada para comparação.");
        return;
    }

    // Paywall: bloqueia comparador para gratuitos (trial expirado)
    const _userPlano = localStorage.getItem('user_plano');
    const _userPlanoId = parseInt(localStorage.getItem('user_plano_id'));
    const _isTrial = localStorage.getItem('is_trial') === 'true';
    const _isAdmin = localStorage.getItem('is_admin') === 'true';
    const _isPremium = _userPlano === 'Premium' || _userPlanoId === 9 || _isAdmin;
    if (!_isPremium && !_isTrial) {
        const evt = window.event;
        const btnComp = (evt && evt.target) ? evt.target.closest('.btn-comparador') : document.querySelector('.metricas-grid .btn-comparador');
        mostrarToastPremium('O acesso ao botão Comparar Indicadores é exclusivo Premium.', btnComp);
        return;
    }

    const modalBg = document.getElementById('modal-comparador-metricas');
    if (modalBg) modalBg.style.display = 'flex';

    const tituloHeader = document.getElementById('tituloComparadorHeader');
    if (tituloHeader) {
        tituloHeader.innerHTML = `📊 Comparar Indicadores de ${window.acaoAtiva.ticker}`;
    }

    // Resetar a largura da sidebar para o padrão. 14/10/2026: só a barra desta janela — a de "Comparar Empresas" tem a mesma
    // classe e as mesmas métricas (antes, abrir esta janela marcava Receita e Lucro lá também, e o gráfico somava as duas: 4 séries).
    const sidebar = document.getElementById('comparador-indicadores-sidebar');
    if (sidebar) {
        sidebar.style.width = '280px';
        sidebar.style.minWidth = '280px';
    }

    // Mostrar/ocultar bloco Indicadores Bancários de acordo com o segmento
    const grupoBancario = document.getElementById('comparador-grupo-bancario');
    if (grupoBancario) {
        const ehBancoComparador = window.acaoAtiva.segmento && window.acaoAtiva.segmento.toLowerCase().includes('banco');
        grupoBancario.style.display = ehBancoComparador ? 'block' : 'none';
    }

    // Configurar listeners de mudança nos checkboxes de forma reativa e resetar seleções
    const inputs = document.querySelectorAll('#comparador-indicadores-sidebar input[type="checkbox"]');
    inputs.forEach(input => {
        if (input.value === 'receita_liquida' || input.value === 'lucro_liquido') {
            input.checked = true;
        } else {
            input.checked = false;
        }
        input.removeEventListener('change', renderizarGraficoComparativo);
        input.addEventListener('change', renderizarGraficoComparativo);
    });

    // Resetar controles para os defaults recomendados
    const escalaEl = document.getElementById('comparador-select-escala');
    if (escalaEl) escalaEl.value = 'DUAL';

    const formatoEl = document.getElementById('comparador-select-formato');
    if (formatoEl) formatoEl.value = 'mixed';

    const periodoEl = document.getElementById('comparador-select-periodo');
    if (periodoEl) periodoEl.value = 'ANUAL';

    // Disparar renderização inicial
    renderizarGraficoComparativo();
};

window.fecharModalComparador = function() {
    const modalBg = document.getElementById('modal-comparador-metricas');
    if (modalBg) modalBg.style.display = 'none';

    // Resetar a posição do modal
    const modalWindow = document.getElementById('modal-comparador-window');
    if (modalWindow) {
        modalWindow.style.transform = 'none';
        comparadorCurrentX = 0;
        comparadorCurrentY = 0;
    }
};

window.atualizarPeriodoComparador = async function() {
    const periodoEl = document.getElementById('comparador-select-periodo');
    const ticker = window.acaoAtiva.ticker;
    const tipo = periodoEl ? periodoEl.value : 'ANUAL';

    if (!window.acaoAtiva.cacheHistorico) {
        window.acaoAtiva.cacheHistorico = {
            'ANUAL': window.acaoAtiva.historico
        };
    }

    if (window.acaoAtiva.cacheHistorico[tipo]) {
        renderizarGraficoComparativo();
        return;
    }

    const canvas = document.getElementById('graficoComparativoCanvas');
    if (canvas) {
        canvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-style:italic;">⏳ Buscando dados históricos...</div>';
        canvas.style.opacity = '0.4';
    }

    try {
        const resp = await fetch(`${API_BASE}/acoes/${ticker}/historico?tipo=${tipo}`);
        if (resp.ok) {
            const data = await resp.json();
            window.acaoAtiva.cacheHistorico[tipo] = data;
        }
    } catch (err) {
        console.error("Erro ao buscar histórico no comparador:", err);
    } finally {
        if (canvas) canvas.style.opacity = '1';
    }

    renderizarGraficoComparativo();
};

// Nota dos comparadores nos períodos de 3 meses e acumulado (P-HIST-03).
function notaPeriodoComparador(tipo) {
    const titulo = tipo === 'YTD'
        ? 'Acumulado no ano:</strong> soma dos trimestres desde o início do exercício fiscal (Raízen, São Martinho, Jalles, CTC e BrasilAgro não fecham em dezembro);'
        : 'Trimestre (3 meses):</strong>';
    return `
            <div class="comparador-aviso-escala">
                🗓️ <strong>${titulo} só fluxos e margens do período; P/L, ROE, dividendos e saldos ficam desabilitados (existem em 12 meses).
            </div>`;
}

// P-HIST-03: nos períodos de 3 meses e acumulado, as métricas fora de METRICAS_PERIODO ficam desabilitadas e desmarcadas.
function aplicarRegraPeriodoComparador(tipo) {
    const trimestre = MODOS_PERIODO.includes(tipo);  // 3 meses ou acumulado
    document.querySelectorAll('#comparador-indicadores-sidebar input[type="checkbox"]').forEach(input => {
        const fora = trimestre && !METRICAS_PERIODO.has(input.value);
        if (fora) input.checked = false;
        input.disabled = fora;
        const label = input.closest('label');
        if (label) label.style.opacity = fora ? '0.45' : '';
    });
    return trimestre;
}

window.renderizarGraficoComparativo = function() {
    if (!window.acaoAtiva) return;
    const periodoRegra = document.getElementById('comparador-select-periodo');
    const emTrimestre = aplicarRegraPeriodoComparador(periodoRegra ? periodoRegra.value : 'ANUAL');

    const checkboxes = document.querySelectorAll('#comparador-indicadores-sidebar input[type="checkbox"]:checked');
    const metricasSelecionadas = Array.from(checkboxes).map(cb => cb.value);

    const canvas = document.getElementById('graficoComparativoCanvas');
    const alertaContainer = document.getElementById('comparador-alerta-container');

    if (metricasSelecionadas.length < 1) {
        alertaContainer.innerHTML = `
            <div class="comparador-aviso-escala alerta" style="margin-bottom:0;">
                ⚠️ <strong>Selecione pelo menos 1 métrica</strong> na barra lateral para iniciar a comparação.
            </div>`;
        if (canvas) {
            canvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-style:italic;font-size:14px;">Marque pelo menos 1 caixa na lateral esquerda.</div>';
        }
        return;
    }

    const periodoEl = document.getElementById('comparador-select-periodo');
    const tipoAtual = periodoEl ? periodoEl.value : 'ANUAL';
    
    const baseHist = (window.acaoAtiva.cacheHistorico && window.acaoAtiva.cacheHistorico[tipoAtual]) 
                     || (tipoAtual === 'ANUAL' ? window.acaoAtiva.historico : []) 
                     || [];

    if (!baseHist || baseHist.length === 0) {
        if (canvas) canvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:14px;">Sem dados históricos disponíveis para este período.</div>';
        return;
    }

    // Ordenar cronologicamente
    const histCronologico = [...baseHist].reverse();

    const datasX = histCronologico.map(d => {
        if (!d.dt_fin_exerc) return 'N/D';
        return tipoAtual === 'ANUAL' 
            ? d.dt_fin_exerc.substring(0, 4) 
            : d.dt_fin_exerc.substring(0, 10).split('-').reverse().join('/');
    });

    const grupos = metricasSelecionadas.map(m => METRICAS_GRUPOS[m] || 'OUTRO');
    const todosMesmoGrupo = grupos.every(g => g === grupos[0]);
    const totalMetricas = metricasSelecionadas.length;

    const escalaEl = document.getElementById('comparador-select-escala');
    let escalaSelecionada = escalaEl ? escalaEl.value : 'AUTO';

    let escalaFinal = escalaSelecionada;
    if (totalMetricas === 1) {
        // Se houver apenas 1 métrica, forçar escala original
        escalaFinal = 'ORIGINAL';
    } else if (escalaSelecionada === 'AUTO') {
        if (totalMetricas === 2) {
            // Com 2 métricas: DUAL sempre (eixos independentes)
            escalaFinal = 'DUAL';
        } else if (todosMesmoGrupo) {
            // 3+ métricas do mesmo grupo: eixo único
            escalaFinal = 'ORIGINAL';
        } else {
            // 3+ métricas de grupos diferentes: normalizar
            escalaFinal = 'BASE100';
        }
    }

    let alertaHTML = '';
    if (escalaFinal === 'ORIGINAL') {
        const descOriginal = totalMetricas === 1 
            ? 'Plotando em valores reais.' 
            : 'Plotando em valores reais de mesma grandeza.';
        alertaHTML = `
            <div class="comparador-aviso-escala">
                🟢 <strong>Escala Original (Eixo Y Único):</strong> ${descOriginal}
            </div>`;
    } else if (escalaFinal === 'DUAL') {
        alertaHTML = `
            <div class="comparador-aviso-escala">
                🔀 <strong>Eixo Y Duplo (Escalas Independentes):</strong> Eixo esquerdo para 1ª métrica (${METRICAS_LABELS[metricasSelecionadas[0]]}) e direito para 2ª métrica (${METRICAS_LABELS[metricasSelecionadas[1]]}).
            </div>`;
    } else if (escalaFinal === 'BASE100') {
        alertaHTML = `
            <div class="comparador-aviso-escala alerta">
                ⚙️ <strong>Indexado (Base 100):</strong> Diferentes ordens de grandeza normalizadas a partir de 100 para comparar tendência e correlação.
            </div>`;
    } else if (escalaFinal === 'VARIACAO') {
        alertaHTML = `
            <div class="comparador-aviso-escala">
                📊 <strong>Variação Acumulada (%):</strong> Variação percentual das métricas desde o ponto inicial da série.
            </div>`;
    }
    if (emTrimestre) {
        alertaHTML += notaPeriodoComparador(periodoRegra.value);
    }
    alertaContainer.innerHTML = alertaHTML;

    const formatadorFormato = document.getElementById('comparador-select-formato');
    const chartType = formatadorFormato ? formatadorFormato.value : 'line';

    const traces = [];

    // Helper functions para transformação
    function normalizarSérieBase100(valores) {
        let divisor = null;
        for (let val of valores) {
            if (val !== null && val !== undefined && val !== 0 && !isNaN(val)) {
                divisor = val;
                break;
            }
        }
        if (divisor === null) divisor = 1;
        return valores.map(v => (v === null || v === undefined || isNaN(v)) ? null : (v / divisor) * 100);
    }

    function calcularVariacaoPercentual(valores) {
        let base = null;
        for (let val of valores) {
            if (val !== null && val !== undefined && val !== 0 && !isNaN(val)) {
                base = val;
                break;
            }
        }
        if (base === null) base = 1;
        return valores.map(v => (v === null || v === undefined || isNaN(v)) ? null : ((v - base) / base) * 100);
    }

    metricasSelecionadas.forEach((metricaKey, index) => {
        const valoresPuros = histCronologico.map(d => {
            let v = d[metricaKey];
            if (v === undefined || v === null || isNaN(v)) return null;
            return v;   // eficiência já em pontos percentuais (11/10/2026)
        });
        let valoresProcessados = [...valoresPuros];
        let sufixoLegenda = '';

        if (escalaFinal === 'BASE100') {
            valoresProcessados = normalizarSérieBase100(valoresPuros);
            sufixoLegenda = ' (Base 100)';
        } else if (escalaFinal === 'VARIACAO') {
            valoresProcessados = calcularVariacaoPercentual(valoresPuros);
            sufixoLegenda = ' (%)';
        }

        const labelMetrica = METRICAS_LABELS[metricaKey] || metricaKey;

        let currentTraceType = chartType;
        if (chartType === 'mixed') {
            currentTraceType = (index === 0) ? 'bar' : 'line';
        }

        const PALETA_CORES = [
            '#0f9d58', // 1ª série: Verde (Receita no Investidor10)
            '#eab308', // 2ª série: Amarelo/Ouro (Lucro no Investidor10)
            '#2563eb', // 3ª série: Azul
            '#dc2626', // 4ª série: Vermelho
            '#8b5cf6', // 5ª série: Roxo
            '#ec4899', // 6ª série: Rosa
            '#f97316'  // 7ª série: Laranja
        ];
        const corSerie = PALETA_CORES[index % PALETA_CORES.length];

        let sufixoHover = '';
        if (escalaFinal === 'VARIACAO' || (escalaFinal === 'ORIGINAL' && (METRICAS_GRUPOS[metricaKey] === 'PERCENTUAL' || metricaKey.includes('%') || metricaKey.includes('cagr') || metricaKey.includes('margem') || metricaKey.includes('taxa') || metricaKey.includes('roe') || metricaKey.includes('roa') || metricaKey.includes('dy') || metricaKey.includes('payout')))) {
            sufixoHover = '%';
        }

        const trace = {
            x: datasX,
            y: valoresProcessados,
            name: labelMetrica + sufixoLegenda,
            type: currentTraceType === 'bar' ? 'bar' : 'scatter',
            hovertemplate: `%{x}: %{y:,.2f}${sufixoHover}<extra></extra>`
        };

        if (currentTraceType === 'line' || currentTraceType === 'scatter') {
            trace.mode = 'lines+markers';
            trace.line = { width: 3, color: corSerie };
            trace.marker = { size: 6, color: corSerie };
        } else if (currentTraceType === 'bar') {
            trace.marker = { color: corSerie };
        }

        if (escalaFinal === 'DUAL' && index === 1) {
            trace.yaxis = 'y2';
        }

        traces.push(trace);
    });

    // Determinar cores reais das séries para títulos dos eixos
    const PALETA_EIXO = [
        '#0f9d58', // 1ª série: Verde
        '#eab308', // 2ª série: Amarelo/Ouro
        '#2563eb', // 3ª série: Azul
        '#dc2626', // 4ª série: Vermelho
        '#8b5cf6', // 5ª série: Roxo
        '#ec4899', // 6ª série: Rosa
        '#f97316'  // 7ª série: Laranja
    ];
    const corEixoEsquerdo = PALETA_EIXO[0];
    const corEixoDireito = PALETA_EIXO[1];
    const labelEixoEsquerdo = METRICAS_LABELS[metricasSelecionadas[0]] || 'Eixo Y';
    const labelEixoDireito = metricasSelecionadas.length >= 2 ? (METRICAS_LABELS[metricasSelecionadas[1]] || '') : '';

    let tituloYEsquerdo = labelEixoEsquerdo;
    if (escalaFinal === 'VARIACAO') tituloYEsquerdo = 'Variação (%)';
    else if (escalaFinal === 'BASE100') tituloYEsquerdo = 'Indexado (Base 100)';

    const layout = {
        margin: { t: 30, r: escalaFinal === 'DUAL' ? 80 : 30, l: 80, b: 120 },
        xaxis: { type: 'category', tickangle: -45 },
        yaxis: {
            title: tituloYEsquerdo,
            titlefont: { color: corEixoEsquerdo },
            tickfont: { color: corEixoEsquerdo },
            gridcolor: 'rgba(226, 232, 240, 0.6)'
        },
        legend: {
            orientation: 'h',
            yanchor: 'top',
            y: -0.18,
            xanchor: 'center',
            x: 0.5
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    if (escalaFinal === 'DUAL') {
        layout.yaxis2 = {
            title: labelEixoDireito,
            titlefont: { color: corEixoDireito },
            tickfont: { color: corEixoDireito },
            overlaying: 'y',
            side: 'right',
            gridcolor: 'rgba(226, 232, 240, 0.3)'
        };
    }

    if (canvas) canvas.innerHTML = '';
    Plotly.newPlot('graficoComparativoCanvas', traces, layout, { displayModeBar: true, scrollZoom: true, responsive: true });
};

// Drag & Drop do Modal Comparador
document.addEventListener('mousedown', function (e) {
    if (e.target && e.target.closest('#modal-comparador-header')) {
        isDraggingComparadorModal = true;
        comparadorDragStartX = e.clientX - comparadorCurrentX;
        comparadorDragStartY = e.clientY - comparadorCurrentY;
        document.body.style.userSelect = 'none';
    }
});

document.addEventListener('mousemove', function (e) {
    if (isDraggingComparadorModal) {
        comparadorCurrentX = e.clientX - comparadorDragStartX;
        comparadorCurrentY = e.clientY - comparadorDragStartY;
        const modal = document.getElementById('modal-comparador-window');
        if (modal) {
            modal.style.transform = `translate(${comparadorCurrentX}px, ${comparadorCurrentY}px)`;
        }
    }
});

document.addEventListener('mouseup', function (e) {
    if (isDraggingComparadorModal) {
        isDraggingComparadorModal = false;
        document.body.style.userSelect = '';
    }
});

// Lógica de Redimensionamento da Sidebar (Splitter) do Comparador
let isResizingSidebar = false;

document.addEventListener('mousedown', function(e) {
    if (e.target && e.target.id === 'comparador-resizer') {
        isResizingSidebar = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }
});

document.addEventListener('mousemove', function(e) {
    if (isResizingSidebar) {
        const sidebar = document.getElementById('comparador-indicadores-sidebar');
        const windowEl = document.getElementById('modal-comparador-window');
        if (sidebar && windowEl) {
            const windowRect = windowEl.getBoundingClientRect();
            const relativeX = e.clientX - windowRect.left;
            // Limitar largura da sidebar entre 180px e 450px para manter usabilidade
            const newWidth = Math.max(180, Math.min(450, relativeX));
            sidebar.style.width = newWidth + 'px';
            sidebar.style.minWidth = newWidth + 'px';
            
            // Reajustar o Plotly para o novo container
            Plotly.Plots.resize('graficoComparativoCanvas');
        }
    }
});

document.addEventListener('mouseup', function() {
    if (isResizingSidebar) {
        isResizingSidebar = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
});

// ====================== MODAL RACIOCINIO IA ======================
let isDraggingRaciocinioModal = false;
let raciocinioDragStartX = 0, raciocinioDragStartY = 0;
let raciocinioCurrentX = 0, raciocinioCurrentY = 0;

// TODO(security): O conteúdo da análise IA vem do backend (LLM interno confiável).
// A formatação markdown inline (bold/headers/listas) é aplicada com regex seguro
// sobre texto gerado pelo próprio sistema RAG, sem input direto do usuário.
window.mudarDataAnaliseIA = async function(ticker, dataISO) {
    var bodyEl = document.getElementById('ia-analysis-body');
    var footerEl = document.getElementById('ia-analysis-footer');
    var btnRaciocinio = document.getElementById('btn-raciocinio-ia');
    
    if (!bodyEl) return;
    
    // Feedback visual de carregamento
    bodyEl.style.opacity = '0.5';
    if (footerEl) footerEl.textContent = '⏳ Carregando análise...';
    
    try {
        var resp = await fetch(API_BASE + '/acoes/' + encodeURIComponent(ticker) + '/analise-ia?data=' + encodeURIComponent(dataISO));
        
        if (!resp.ok) {
            var errData = await resp.json().catch(function() { return {}; });
            throw new Error(errData.detail || 'Erro ao buscar análise.');
        }
        
        var data = await resp.json();
        
        // Atualiza o texto da análise (mesma formatação markdown já usada no portal)
        var textoFormatado = (data.analise_ia_texto || '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/### (.*?)\n/g, '<h4>$1</h4>')
            .replace(/- (.*?)\n/g, '• $1\n');
        bodyEl.innerHTML = textoFormatado;
        
        // Atualiza o raciocínio no cache (para o modal funcionar)
        if (window.acaoAtiva) {
            window.acaoAtiva.raciocinio_ia = data.raciocinio_ia || null;
            window.acaoAtiva.analise_ia_texto = data.analise_ia_texto || null;
        }
        
        // Mostra/oculta botão de raciocínio conforme disponibilidade
        if (btnRaciocinio) {
            btnRaciocinio.style.display = data.raciocinio_ia ? '' : 'none';
        }
        
        if (footerEl) footerEl.textContent = 'Análise de ' + formatarDataBR(dataISO) + '. Fonte: RAG IA / Documentos B3 e CVM';
    } catch (err) {
        if (footerEl) {
            footerEl.textContent = '❌ ' + (err.message || 'Erro ao carregar análise.');
            footerEl.style.color = 'var(--accent-red)';
        }
    } finally {
        bodyEl.style.opacity = '1';
    }
};

window.abrirModalRaciocinio = function(ticker) {
    if (!window.acaoAtiva || !window.acaoAtiva.raciocinio_ia) return;
    
    const modalBg = document.getElementById('modal-raciocinio-ia');
    const tickerEl = document.getElementById('modal-raciocinio-ticker');
    const bodyEl = document.getElementById('modal-raciocinio-body');
    
    if (modalBg && tickerEl && bodyEl) {
        tickerEl.innerText = ticker;
        
        // Formata markdown simples no raciocínio da IA
        let textoFormatado = window.acaoAtiva.raciocinio_ia;
        textoFormatado = textoFormatado
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/### (.*?)\n/g, '<h4>$1</h4>')
            .replace(/- (.*?)\n/g, '• $1\n');
            
        bodyEl.innerHTML = textoFormatado;
        modalBg.style.display = 'flex';
    }
};

window.fecharModalRaciocinio = function() {
    const modalBg = document.getElementById('modal-raciocinio-ia');
    if (modalBg) {
        modalBg.style.display = 'none';
    }
    // Resetar posição
    const modalWindow = document.getElementById('modal-raciocinio-window');
    if (modalWindow) {
        modalWindow.style.transform = 'none';
        raciocinioCurrentX = 0;
        raciocinioCurrentY = 0;
    }
};

// Drag & Drop do Modal Raciocínio
document.addEventListener('mousedown', function (e) {
    if (e.target && e.target.closest('#modal-raciocinio-header')) {
        isDraggingRaciocinioModal = true;
        raciocinioDragStartX = e.clientX - raciocinioCurrentX;
        raciocinioDragStartY = e.clientY - raciocinioCurrentY;
        document.body.style.userSelect = 'none';
    }
});

document.addEventListener('mousemove', function (e) {
    if (isDraggingRaciocinioModal) {
        raciocinioCurrentX = e.clientX - raciocinioDragStartX;
        raciocinioCurrentY = e.clientY - raciocinioDragStartY;
        const modal = document.getElementById('modal-raciocinio-window');
        if (modal) {
            modal.style.transform = `translate(${raciocinioCurrentX}px, ${raciocinioCurrentY}px)`;
        }
    }
});

document.addEventListener('mouseup', function () {
    if (isDraggingRaciocinioModal) {
        isDraggingRaciocinioModal = false;
        document.body.style.userSelect = '';
    }
});

// ====================== MODAL PERGUNTAR IA ======================
let isDraggingPerguntarModal = false;
let perguntarDragStartX = 0, perguntarDragStartY = 0;
let perguntarCurrentX = 0, perguntarCurrentY = 0;

// Cache da última resposta da IA (para evitar perder ao fechar/reabrir)
let ultimaRespostaIA = null;

window.abrirModalPerguntarIA = function() {
    const modalBg = document.getElementById('modal-perguntar-ia');
    const modalWindow = document.getElementById('modal-perguntar-ia-window');
    if (modalBg && modalWindow) {
        modalBg.style.display = 'flex';
        
        // Validação Plano IA RAG (exclusiva plano_id = 9)
        const userPlanoId = parseInt(localStorage.getItem('user_plano_id'));
        const isPremium = userPlanoId === 9;
        
        const paywallDiv = document.getElementById('ia-modal-paywall');
        const contentDiv = document.getElementById('ia-modal-content');
        const modalBody = modalWindow.querySelector('.modal-ia-body');
        
        if (isPremium) {
            // Tamanho normal completo para a resposta RAG
            modalWindow.style.height = '85vh';
            modalWindow.style.maxWidth = '900px';
            if (modalBody) {
                modalBody.style.overflowY = 'auto'; // Restaura rolagem vertical
            }
            
            if (paywallDiv) paywallDiv.style.display = 'none';
            if (contentDiv) contentDiv.style.display = 'flex';
            // Foca na textarea após abrir
            setTimeout(function() {
                const textarea = document.getElementById('ia-pergunta-input');
                if (textarea) textarea.focus();
            }, 100);
        } else {
            // Tamanho compacto reduzido apenas para as informações de paywall
            modalWindow.style.height = '340px';
            modalWindow.style.maxWidth = '460px';
            if (modalBody) {
                modalBody.style.overflowY = 'hidden'; // Remove barra de rolagem vertical no paywall
            }
            
            if (paywallDiv) paywallDiv.style.display = 'flex';
            if (contentDiv) contentDiv.style.display = 'none';
        }
    }
};

window.fecharModalPerguntarIA = function() {
    const modalBg = document.getElementById('modal-perguntar-ia');
    if (modalBg) {
        modalBg.style.display = 'none';
    }
    // Resetar posição e dimensões
    const modalWindow = document.getElementById('modal-perguntar-ia-window');
    if (modalWindow) {
        modalWindow.style.transform = 'none';
        modalWindow.style.height = '';
        modalWindow.style.maxWidth = '';
        const modalBody = modalWindow.querySelector('.modal-ia-body');
        if (modalBody) {
            modalBody.style.overflowY = '';
        }
        perguntarCurrentX = 0;
        perguntarCurrentY = 0;
    }
};

/**
 * Sanitiza texto para inserção segura como HTML.
 * Escapa caracteres especiais para prevenir XSS.
 */
function sanitizarTextoIA(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

/**
 * Formata markdown simplificado para exibição.
 * Aplicado após sanitização para segurança.
 */
function formatarMarkdownIA(textoSanitizado) {
    return textoSanitizado
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/### (.*?)\n/g, '<h4 style="margin:12px 0 6px;color:var(--text-primary)">$1</h4>\n')
        .replace(/## (.*?)\n/g, '<h3 style="margin:16px 0 8px;color:var(--text-primary)">$1</h3>\n')
        .replace(/- (.*?)\n/g, '• $1\n')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');
}

window.executarPerguntaIA = async function() {
    const textarea = document.getElementById('ia-pergunta-input');
    const btn = document.getElementById('ia-btn-executar');
    const btnText = document.getElementById('ia-btn-executar-text');
    const btnSpinner = document.getElementById('ia-btn-executar-spinner');
    const statusText = document.getElementById('ia-status-text');
    const resultContainer = document.getElementById('ia-resultado-container');
    const resultBody = document.getElementById('ia-resultado-body');
    const empresaBadge = document.getElementById('ia-empresa-badge');
    const pensamentoWrapper = document.getElementById('ia-pensamento-wrapper');
    const pensamentoBody = document.getElementById('ia-pensamento-body');

    if (!textarea || !btn) return;

    const pergunta = textarea.value.trim();
    if (pergunta.length < 5) {
        statusText.textContent = 'Digite pelo menos 5 caracteres.';
        statusText.style.color = 'var(--accent-red)';
        return;
    }

    // Estado: loading
    btn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';
    statusText.textContent = '🧠 Analisando... Isso pode levar até 60 segundos.';
    statusText.style.color = 'var(--text-muted)';
    resultContainer.style.display = 'none';

    const startTime = Date.now();

    try {
        const resp = await fetch(API_BASE + '/ia/perguntar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pergunta: pergunta })
        });

        if (resp.status === 403) {
            statusText.textContent = '🔒 Recurso exclusivo do plano IA.';
            statusText.style.color = 'var(--accent-red)';
            return;
        }

        if (!resp.ok) {
            const errData = await resp.json().catch(function() { return {}; });
            throw new Error(errData.detail || 'Erro ao processar a pergunta.');
        }

        const data = await resp.json();
        ultimaRespostaIA = data;

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        // Exibe resultado
        resultContainer.style.display = 'flex';

        // Badge da empresa
        if (data.empresa) {
            empresaBadge.textContent = '🎯 Empresa: ' + data.empresa + (data.cnpj ? ' (' + data.cnpj + ')' : '');
            empresaBadge.style.display = 'block';
        } else {
            empresaBadge.style.display = 'none';
        }

        // TODO(security): A resposta vem do backend (LLM) que é confiável internamente.
        // Sanitizamos para evitar XSS de prompt injection indireta via documentos RAG.
        const respostaSanitizada = sanitizarTextoIA(data.resposta);
        resultBody.innerHTML = formatarMarkdownIA(respostaSanitizada);

        // Pensamento (raciocínio)
        if (data.pensamento) {
            pensamentoWrapper.style.display = 'block';
            const pensamentoSanitizado = sanitizarTextoIA(data.pensamento);
            pensamentoBody.innerHTML = formatarMarkdownIA(pensamentoSanitizado);
            pensamentoBody.style.display = 'none'; // Começa colapsado
        } else {
            pensamentoWrapper.style.display = 'none';
        }

        statusText.textContent = '✅ Resposta gerada em ' + elapsed + 's · Modelo: ' + (data.modelo || 'N/A') + ' · ' + (data.num_contextos || 0) + ' contextos';
        statusText.style.color = 'var(--accent-green)';

    } catch (err) {
        statusText.textContent = '❌ ' + (err.message || 'Erro de conexão com o servidor.');
        statusText.style.color = 'var(--accent-red)';
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }
};

window.togglePensamentoIA = function() {
    const body = document.getElementById('ia-pensamento-body');
    const btn = document.getElementById('ia-btn-pensamento');
    if (body && btn) {
        if (body.style.display === 'none') {
            body.style.display = 'block';
            btn.textContent = '💡 Ocultar Raciocínio da IA';
        } else {
            body.style.display = 'none';
            btn.textContent = '💡 Ver Raciocínio da IA';
        }
    }
};

// Atalho Ctrl+Enter para executar na textarea
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const textarea = document.getElementById('ia-pergunta-input');
        const modal = document.getElementById('modal-perguntar-ia');
        if (textarea && modal && modal.style.display === 'flex' && document.activeElement === textarea) {
            e.preventDefault();
            executarPerguntaIA();
        }
    }
});

// Fechar modal ao clicar no backdrop
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'modal-perguntar-ia') {
        fecharModalPerguntarIA();
    }
});

// Drag & Drop do Modal Perguntar
document.addEventListener('mousedown', function (e) {
    if (e.target && e.target.closest('#modal-perguntar-ia-header')) {
        isDraggingPerguntarModal = true;
        perguntarDragStartX = e.clientX - perguntarCurrentX;
        perguntarDragStartY = e.clientY - perguntarCurrentY;
        document.body.style.userSelect = 'none';
    }
});

document.addEventListener('mousemove', function (e) {
    if (isDraggingPerguntarModal) {
        perguntarCurrentX = e.clientX - perguntarDragStartX;
        perguntarCurrentY = e.clientY - perguntarDragStartY;
        const modal = document.getElementById('modal-perguntar-ia-window');
        if (modal) {
            modal.style.transform = 'translate(' + perguntarCurrentX + 'px, ' + perguntarCurrentY + 'px)';
        }
    }
});

document.addEventListener('mouseup', function () {
    if (isDraggingPerguntarModal) {
        isDraggingPerguntarModal = false;
        document.body.style.userSelect = '';
    }
});

// =====================================================================
// COMPARADOR DE EMPRESAS (MÚLTIPLOS TICKERS)
// =====================================================================
let cacheHistoricoEmpresas = {};
let isDraggingComparadorEmpresasModal = false;
let comparadorEmpresasDragStartX = 0, comparadorEmpresasDragStartY = 0;
let comparadorEmpresasCurrentX = 0, comparadorEmpresasCurrentY = 0;
let isResizingEmpresasSidebar = false;

window.abrirModalCompararEmpresas = function() {
    // Paywall: bloqueia se for gratuito com trial expirado
    const _userPlano = localStorage.getItem('user_plano');
    const _userPlanoId = parseInt(localStorage.getItem('user_plano_id'));
    const _isTrial = localStorage.getItem('is_trial') === 'true';
    const _isAdmin = localStorage.getItem('is_admin') === 'true';
    const _isPremium = _userPlano === 'Premium' || _userPlanoId === 9 || _isAdmin;
    if (!_isPremium && !_isTrial) {
        const btnComp = document.getElementById('btn-comparar-empresas') || document.querySelector('#secao-ranking .btn-comparador');
        mostrarToastPremium('O acesso ao botão Comparar Empresas é exclusivo Premium.', btnComp);
        return;
    }

    const modalBg = document.getElementById('modal-comparador-empresas');
    if (modalBg) modalBg.style.display = 'flex';

    // Resetar largura da sidebar para o padrão
    const sidebar = document.querySelector('#modal-comparador-empresas-window .comparador-sidebar');
    if (sidebar) {
        sidebar.style.width = '280px';
        sidebar.style.minWidth = '280px';
    }

    // Pré-preenchimento dos inputs de ticker a partir do ranking atual ou ação ativa
    let prefilled = [];
    if (window.rankingAtualData && window.rankingAtualData.length > 0) {
        prefilled = window.rankingAtualData.slice(0, 2).map(item => item.ticker).filter(Boolean);
    } else if (window.acaoAtiva && window.acaoAtiva.ticker) {
        prefilled = [window.acaoAtiva.ticker];
    }

    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`comp-ticker-${i}`);
        if (input) {
            input.value = prefilled[i - 1] || '';
            input.style.borderColor = ''; // resetar estilo de erro
        }
        // fechar sugestões
        const sug = document.getElementById(`sugestoes-comp-ticker-${i}`);
        if (sug) {
            sug.innerHTML = '';
            sug.style.display = 'none';
        }
    }

    // Garantir que todos os inputs de métrica sejam checkboxes
    const inputsMetricas = document.querySelectorAll('input[name="comparar-empresas-metrica"]');
    inputsMetricas.forEach(input => {
        if (input.type !== 'checkbox') {
            input.type = 'checkbox';
            input.removeAttribute('onchange');
            input.onchange = function() {
                window.gerenciarSelecaoMetricas(this);
            };
        }
    });

    // Métricas padrão: receita, lucro e EBIT (o EBIT entrou com o limite de 3 métricas; pedido do usuário, 14/10/2026)
    window.compararEmpresasMetricasAtivas = ['receita_liquida', 'lucro_liquido', 'ebit'];
    inputsMetricas.forEach(cb => {
        cb.checked = window.compararEmpresasMetricasAtivas.includes(cb.value);
    });

    // Resetar controles
    const escalaEl = document.getElementById('comparador-empresas-select-escala');
    if (escalaEl) escalaEl.value = 'ORIGINAL';

    const formatoEl = document.getElementById('comparador-empresas-select-formato');
    if (formatoEl) formatoEl.value = 'line';

    const periodoEl = document.getElementById('comparador-empresas-select-periodo');
    if (periodoEl) periodoEl.value = 'ANUAL';

    // Disparar busca e renderização
    buscarDadosEPlotarComparativo();
};

window.fecharModalCompararEmpresas = function() {
    const modalBg = document.getElementById('modal-comparador-empresas');
    if (modalBg) modalBg.style.display = 'none';

    // Resetar a posição do modal
    const modalWindow = document.getElementById('modal-comparador-empresas-window');
    if (modalWindow) {
        modalWindow.style.transform = 'none';
        comparadorEmpresasCurrentX = 0;
        comparadorEmpresasCurrentY = 0;
    }
};

// Configuração do autocomplete de sugestões nos inputs de comparação
document.addEventListener('DOMContentLoaded', function() {
    let compDebounceTimers = {};

    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`comp-ticker-${i}`);
        const sugestoesDiv = document.getElementById(`sugestoes-comp-ticker-${i}`);

        if (input && sugestoesDiv) {
            input.addEventListener('input', function() {
                const query = input.value.trim();
                clearTimeout(compDebounceTimers[i]);

                if (query.length < 2) {
                    sugestoesDiv.innerHTML = '';
                    sugestoesDiv.style.display = 'none';
                    return;
                }

                compDebounceTimers[i] = setTimeout(async () => {
                    try {
                        const resp = await fetch(`${API_BASE}/acoes/busca?q=${encodeURIComponent(query)}`);
                        if (!resp.ok) throw new Error('Erro na busca');
                        const sugestoes = await resp.json();

                        if (sugestoes.length > 0) {
                            sugestoesDiv.innerHTML = sugestoes.map(s => `
                                <div class="suggestion-item-comp" data-ticker="${s.ticker}">
                                    <span class="suggestion-ticker-comp">${s.ticker}</span>
                                    <span class="suggestion-name-comp">${s.nome_empresa || ''}</span>
                                </div>
                            `).join('');
                            sugestoesDiv.style.display = 'block';

                            // Adicionar evento click nos itens de sugestão
                            sugestoesDiv.querySelectorAll('.suggestion-item-comp').forEach(item => {
                                item.addEventListener('click', function() {
                                    input.value = this.dataset.ticker;
                                    sugestoesDiv.style.display = 'none';
                                    input.style.borderColor = '';
                                    buscarDadosEPlotarComparativo();
                                });
                            });
                        } else {
                            sugestoesDiv.innerHTML = '';
                            sugestoesDiv.style.display = 'none';
                        }
                    } catch (err) {
                        console.error('Erro nas sugestões de comparação:', err);
                    }
                }, 300);
            });

            // Evitar que cliques dentro do input de sugestão se propaguem indesejadamente
            sugestoesDiv.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
    }

    // Fechar sugestões ao clicar fora
    document.addEventListener('click', function(e) {
        for (let i = 1; i <= 6; i++) {
            const input = document.getElementById(`comp-ticker-${i}`);
            const sug = document.getElementById(`sugestoes-comp-ticker-${i}`);
            if (sug && e.target !== input && !sug.contains(e.target)) {
                sug.style.display = 'none';
            }
        }
        
        // Fechar modal de comparação ao clicar no backdrop
    });
});

// Comparar Empresas: até 3 métricas (pedido do usuário, 14/10/2026; antes 2). Cada métrica tem seu traço (linha: contínua, tracejada,
// pontilhada; barra: sólida, hachurada, quadriculada) e seu eixo Y (1ª à esquerda; 2ª e 3ª à direita, a 3ª afastada).
const MAX_METRICAS_EMPRESAS = 3;
const ESTILOS_METRICAS_EMPRESAS = [
    { linha: 'solid', nomeLinha: 'Contínua', padrao: '', nomeBarra: 'Sólido', eixo: 'y' },
    { linha: 'dash', nomeLinha: 'Tracejada', padrao: '/', nomeBarra: 'Hachurado', eixo: 'y2' },
    { linha: 'dot', nomeLinha: 'Pontilhada', padrao: 'x', nomeBarra: 'Quadriculado', eixo: 'y3' }
];

window.gerenciarSelecaoMetricas = function(inputEl) {
    if (!window.compararEmpresasMetricasAtivas) {
        window.compararEmpresasMetricasAtivas = ['receita_liquida'];
    }
    
    const val = inputEl.value;
    if (inputEl.checked) {
        if (window.compararEmpresasMetricasAtivas.includes(val)) return;
        
        if (window.compararEmpresasMetricasAtivas.length >= MAX_METRICAS_EMPRESAS) {  // a mais antiga sai
            const antigo = window.compararEmpresasMetricasAtivas.shift();
            const checkboxAntigo = document.querySelector(`input[name="comparar-empresas-metrica"][value="${antigo}"]`);
            if (checkboxAntigo) {
                checkboxAntigo.checked = false;
            }
        }
        window.compararEmpresasMetricasAtivas.push(val);
    } else {
        if (window.compararEmpresasMetricasAtivas.length <= 1) {
            inputEl.checked = true;
            return;
        }
        window.compararEmpresasMetricasAtivas = window.compararEmpresasMetricasAtivas.filter(v => v !== val);
    }
    
    renderizarGraficoComparativoEmpresas();
};

window.buscarDadosEPlotarComparativo = async function() {
    const tickersValidos = [];
    const inputs = [];
    
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`comp-ticker-${i}`);
        if (input) {
            inputs.push(input);
            const val = input.value.trim().toUpperCase();
            if (val) {
                tickersValidos.push(val);
                input.value = val; // sanitiza visualmente
            }
        }
    }

    const canvas = document.getElementById('graficoComparativoEmpresasCanvas');
    const alertaContainer = document.getElementById('comparador-empresas-alerta-container');

    if (tickersValidos.length < 2) {
        if (alertaContainer) {
            alertaContainer.innerHTML = `
                <div class="comparador-aviso-escala alerta" style="margin-bottom:0;">
                    ⚠️ <strong>Selecione pelo menos 2 tickers</strong> para iniciar a comparação de empresas.
                </div>`;
        }
        if (canvas) {
            canvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-style:italic;font-size:14px;">Preencha pelo menos 2 tickers nos campos acima para comparar.</div>';
        }
        return;
    }

    const periodoEl = document.getElementById('comparador-empresas-select-periodo');
    const tipo = periodoEl ? periodoEl.value : 'ANUAL';

    if (canvas) {
        canvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-style:italic;">⏳ Buscando dados históricos das empresas...</div>';
        canvas.style.opacity = '0.4';
    }

    try {
        // Buscar em paralelo para todos os tickers válidos
        const promessas = tickersValidos.map(async (ticker) => {
            const cacheKey = `${ticker}_${tipo}`;
            if (cacheHistoricoEmpresas[cacheKey]) {
                return { ticker, sucesso: true, dados: cacheHistoricoEmpresas[cacheKey] };
            }
            try {
                const resp = await fetch(`${API_BASE}/acoes/${ticker}/historico?tipo=${tipo}`);
                if (resp.ok) {
                    const dados = await resp.json();
                    cacheHistoricoEmpresas[cacheKey] = dados;
                    return { ticker, sucesso: true, dados };
                } else {
                    return { ticker, sucesso: false, erro: 'Status de erro da API' };
                }
            } catch (err) {
                return { ticker, sucesso: false, erro: err.message };
            }
        });

        const resultados = await Promise.all(promessas);

        let algumErro = false;
        resultados.forEach(res => {
            // Achar o input correspondente a este ticker para sinalizar erro se houver
            const inputEl = inputs.find(inp => inp.value.trim().toUpperCase() === res.ticker);
            if (!res.sucesso) {
                algumErro = true;
                if (inputEl) {
                    inputEl.style.borderColor = 'var(--accent-red)';
                    inputEl.title = 'Erro ao carregar dados históricos para este ticker (verifique se ele é válido ou IPO recente).';
                }
                console.warn(`Erro no histórico de ${res.ticker}: ${res.erro}`);
            } else {
                if (inputEl) {
                    inputEl.style.borderColor = '';
                    inputEl.title = '';
                }
            }
        });

        if (algumErro) {
            const bemSucedidos = resultados.filter(r => r.sucesso).map(r => r.ticker);
            if (bemSucedidos.length < 2) {
                if (alertaContainer) {
                    alertaContainer.innerHTML = `
                        <div class="comparador-aviso-escala alerta" style="margin-bottom:0; background-color: rgba(220, 38, 38, 0.1); border-color: var(--accent-red);">
                            ❌ Erro ao carregar dados históricos suficientes para comparação (mínimo 2 empresas válidas). Verifique os campos destacados em vermelho.
                        </div>`;
                }
                if (canvas) {
                    canvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--accent-red);font-size:14px;">Erro ao carregar dados históricos das empresas destacadas.</div>';
                }
                if (canvas) canvas.style.opacity = '1';
                return;
            }
        }

    } catch (err) {
        console.error("Erro geral no buscarDadosEPlotarComparativo:", err);
    } finally {
        if (canvas) canvas.style.opacity = '1';
    }

    renderizarGraficoComparativoEmpresas();
};

window.atualizarPeriodoComparadorEmpresas = function() {
    buscarDadosEPlotarComparativo();
};

// P-HIST-03 (14/10/2026): nos períodos de 3 meses e acumulado, as métricas fora de METRICAS_PERIODO ficam desabilitadas e saem da seleção
// (sobrando nenhuma, volta para Receita Líquida), como no Comparar Indicadores.
function aplicarRegraPeriodoComparadorEmpresas(tipo) {
    const trimestre = MODOS_PERIODO.includes(tipo);  // 3 meses ou acumulado
    document.querySelectorAll('#comparador-empresas-sidebar input[name="comparar-empresas-metrica"]').forEach(input => {
        const fora = trimestre && !METRICAS_PERIODO.has(input.value);
        if (fora) input.checked = false;
        input.disabled = fora;
        const label = input.closest('label');
        if (label) label.style.opacity = fora ? '0.45' : '';
    });
    if (trimestre && window.compararEmpresasMetricasAtivas) {
        window.compararEmpresasMetricasAtivas = window.compararEmpresasMetricasAtivas.filter(m => METRICAS_PERIODO.has(m));
        if (window.compararEmpresasMetricasAtivas.length === 0) {
            window.compararEmpresasMetricasAtivas = ['receita_liquida'];
            const receita = document.querySelector('#comparador-empresas-sidebar input[name="comparar-empresas-metrica"][value="receita_liquida"]');
            if (receita) receita.checked = true;
        }
    }
    return trimestre;
}

window.renderizarGraficoComparativoEmpresas = function() {
    const periodoRegraEmpresas = document.getElementById('comparador-empresas-select-periodo');
    const emTrimestreEmpresas = aplicarRegraPeriodoComparadorEmpresas(periodoRegraEmpresas ? periodoRegraEmpresas.value : 'ANUAL');
    if (!window.compararEmpresasMetricasAtivas || window.compararEmpresasMetricasAtivas.length === 0) {
        window.compararEmpresasMetricasAtivas = ['receita_liquida'];
    }
    const metricasAtivas = window.compararEmpresasMetricasAtivas;

    const tickersValidos = [];
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`comp-ticker-${i}`);
        if (input) {
            const val = input.value.trim().toUpperCase();
            if (val) tickersValidos.push(val);
        }
    }

    const canvas = document.getElementById('graficoComparativoEmpresasCanvas');
    const alertaContainer = document.getElementById('comparador-empresas-alerta-container');

    if (tickersValidos.length < 2) return;

    const periodoEl = document.getElementById('comparador-empresas-select-periodo');
    const tipoAtual = periodoEl ? periodoEl.value : 'ANUAL';

    // Filtrar somente as empresas que realmente estão no cache (as que deram sucesso)
    const empresasComDados = tickersValidos.filter(ticker => {
        const cacheKey = `${ticker}_${tipoAtual}`;
        return !!cacheHistoricoEmpresas[cacheKey];
    });

    if (empresasComDados.length < 2) {
        if (canvas) canvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:14px;">Carregando ou sem dados suficientes para comparação.</div>';
        return;
    }

    // Controlar a exibição da seção de Indicadores Bancários de forma dinâmica e automatizada
    const temBanco = empresasComDados.some(t => {
        const cacheKey = `${t}_${tipoAtual}`;
        const hist = cacheHistoricoEmpresas[cacheKey] || [];
        return hist.some(d => d.indice_basileia !== undefined && d.indice_basileia !== null);
    });
    const grupoBancario = document.getElementById('comparador-empresas-grupo-bancario');
    if (grupoBancario) {
        grupoBancario.style.display = temBanco ? 'block' : 'none';
    }

    // 1. Unir e ordenar datas do eixo X cronologicamente
    let todasDatasSet = new Set();
    empresasComDados.forEach(ticker => {
        const cacheKey = `${ticker}_${tipoAtual}`;
        const hist = cacheHistoricoEmpresas[cacheKey] || [];
        hist.forEach(d => {
            if (d.dt_fin_exerc) {
                const dataStr = tipoAtual === 'ANUAL' 
                    ? d.dt_fin_exerc.substring(0, 4) 
                    : d.dt_fin_exerc.substring(0, 10).split('-').reverse().join('/');
                todasDatasSet.add(dataStr);
            }
        });
    });

    let datasX = Array.from(todasDatasSet);
    if (tipoAtual === 'ANUAL') {
        datasX.sort((a, b) => parseInt(a) - parseInt(b));
    } else {
        datasX.sort((a, b) => {
            const partesA = a.split('/');
            const partesB = b.split('/');
            const dataA = new Date(partesA[2], partesA[1] - 1, partesA[0]);
            const dataB = new Date(partesB[2], partesB[1] - 1, partesB[0]);
            return dataA - dataB;
        });
    }

    const escalaEl = document.getElementById('comparador-empresas-select-escala');
    const escalaFinal = escalaEl ? escalaEl.value : 'ORIGINAL';

    let alertaHTML = '';
    if (escalaFinal === 'ORIGINAL') {
        alertaHTML = `
            <div class="comparador-aviso-escala">
                🟢 <strong>Valores Originais (Eixo Y Único):</strong> Comparando os valores brutos reportados pelas empresas.
            </div>`;
    } else if (escalaFinal === 'BASE100') {
        alertaHTML = `
            <div class="comparador-aviso-escala alerta">
                ⚙️ <strong>Indexado (Base 100):</strong> As curvas iniciam de 100 para comparar tendências, correlação e crescimento relativo entre empresas de portes diferentes.
            </div>`;
    } else if (escalaFinal === 'VARIACAO') {
        alertaHTML = `
            <div class="comparador-aviso-escala">
                📊 <strong>Variação Acumulada (%):</strong> Mostra a variação percentual das métricas a partir da primeira data reportada de cada ativo.
            </div>`;
    }
    if (emTrimestreEmpresas) {
        alertaHTML += notaPeriodoComparador(periodoRegraEmpresas.value);
    }
    if (alertaContainer) alertaContainer.innerHTML = alertaHTML;

    const formatadorFormato = document.getElementById('comparador-empresas-select-formato');
    const chartType = formatadorFormato ? formatadorFormato.value : 'line';

    const traces = [];

    // Helpers de escalas
    function normalizarSérieBase100(valores) {
        let divisor = null;
        for (let val of valores) {
            if (val !== null && val !== undefined && val !== 0 && !isNaN(val)) {
                divisor = val;
                break;
            }
        }
        if (divisor === null) divisor = 1;
        return valores.map(v => (v === null || v === undefined || isNaN(v)) ? null : (v / divisor) * 100);
    }

    function calcularVariacaoPercentual(valores) {
        let base = null;
        for (let val of valores) {
            if (val !== null && val !== undefined && val !== 0 && !isNaN(val)) {
                base = val;
                break;
            }
        }
        if (base === null) base = 1;
        return valores.map(v => (v === null || v === undefined || isNaN(v)) ? null : ((v - base) / base) * 100);
    }

    empresasComDados.forEach((ticker, index) => {
        const cacheKey = `${ticker}_${tipoAtual}`;
        const hist = cacheHistoricoEmpresas[cacheKey] || [];
        
        const PALETA_CORES = [
            '#2563eb', // Azul
            '#0f9d58', // Verde
            '#eab308', // Amarelo
            '#dc2626', // Vermelho
            '#8b5cf6', // Roxo
            '#ec4899', // Rosa
            '#f97316'  // Laranja
        ];
        const corSerie = PALETA_CORES[index % PALETA_CORES.length];

        metricasAtivas.forEach((metrica, metricaIdx) => {
            // Mapear dados para as datas do eixo X ordenado
            const mapaValores = {};
            hist.forEach(d => {
                if (d.dt_fin_exerc) {
                    const dataStr = tipoAtual === 'ANUAL' 
                        ? d.dt_fin_exerc.substring(0, 4) 
                        : d.dt_fin_exerc.substring(0, 10).split('-').reverse().join('/');
                    mapaValores[dataStr] = d[metrica];
                }
            });

            const valoresPuros = datasX.map(dataStr => {
                let v = mapaValores[dataStr];
                if (v === undefined || v === null || isNaN(v)) return null;
                return v;   // eficiência já em pontos percentuais (11/10/2026)
            });

            let valoresProcessados = [...valoresPuros];
            let sufixoLegenda = '';

            if (escalaFinal === 'BASE100') {
                valoresProcessados = normalizarSérieBase100(valoresPuros);
                sufixoLegenda = ' (Base 100)';
            } else if (escalaFinal === 'VARIACAO') {
                valoresProcessados = calcularVariacaoPercentual(valoresPuros);
                sufixoLegenda = ' (%)';
            }

            const labelMetrica = METRICAS_LABELS[metrica] || metrica;
            
            // Montar nome da série na legenda
            let nomeSerie = `${ticker}${sufixoLegenda}`;

            let sufixoHover = '';
            if (escalaFinal === 'VARIACAO' || (escalaFinal === 'ORIGINAL' && (METRICAS_GRUPOS[metrica] === 'PERCENTUAL' || metrica.includes('%') || metrica.includes('cagr') || metrica.includes('margem') || metrica.includes('taxa') || metrica.includes('roe') || metrica.includes('roa') || metrica.includes('dy') || metrica.includes('payout')))) {
                sufixoHover = '%';
            }

            const trace = {
                x: datasX,
                y: valoresProcessados,
                name: nomeSerie,
                type: chartType === 'bar' ? 'bar' : 'scatter',
                hovertemplate: `${ticker} - ${labelMetrica} %{x}: %{y:,.2f}${sufixoHover}<extra></extra>`
            };

            // Com mais de uma métrica, o ticker aparece uma vez na legenda (na primeira métrica)
            if (metricasAtivas.length > 1 && metricaIdx > 0) {
                trace.showlegend = false;
            }

            // Cada métrica no seu eixo e com o seu traço (ESTILOS_METRICAS_EMPRESAS)
            const estilo = ESTILOS_METRICAS_EMPRESAS[metricaIdx] || ESTILOS_METRICAS_EMPRESAS[0];
            if (estilo.eixo !== 'y') {
                trace.yaxis = estilo.eixo;
            }

            if (chartType === 'line' || chartType === 'scatter') {
                trace.mode = 'lines+markers';
                trace.line = { 
                    width: 3, 
                    color: corSerie
                };
                if (estilo.linha !== 'solid') {
                    trace.line.dash = estilo.linha;
                }
                trace.marker = { size: 6, color: corSerie };
            } else if (chartType === 'bar') {
                trace.marker = { color: corSerie };
                trace.offsetgroup = `${ticker}_${metricaIdx}`;
                if (estilo.padrao) {
                    trace.marker.pattern = {
                        shape: estilo.padrao,
                        bgcolor: corSerie,
                        fgcolor: 'rgba(255,255,255,0.4)',
                        solidity: 0.3
                    };
                }
            }

            traces.push(trace);
        });
    });

    // Com mais de uma métrica, uma legenda-modelo por métrica (o traço de cada uma, em cinza)
    if (metricasAtivas.length > 1) {
        metricasAtivas.forEach((metrica, idx) => {
            const estilo = ESTILOS_METRICAS_EMPRESAS[idx];
            const label = METRICAS_LABELS[metrica] || metrica;
            if (chartType === 'bar') {
                const marker = { color: '#94a3b8' };
                if (estilo.padrao) marker.pattern = { shape: estilo.padrao, bgcolor: '#94a3b8', fgcolor: 'rgba(255,255,255,0.4)', solidity: 0.3 };
                traces.push({ x: [null], y: [null], name: `${label} (${estilo.nomeBarra})`, type: 'bar', marker,
                    offsetgroup: `dummy_${idx + 1}`, showlegend: true, hoverinfo: 'none' });
            } else {
                const line = { color: '#94a3b8', width: 3 };
                if (estilo.linha !== 'solid') line.dash = estilo.linha;
                traces.push({ x: [null], y: [null], name: `${label} (${estilo.nomeLinha})`, mode: 'lines', line, type: 'scatter',
                    showlegend: true, hoverinfo: 'none' });
            }
        });
    }

    const labelMetrica1 = METRICAS_LABELS[metricasAtivas[0]] || metricasAtivas[0];
    let ytitle1 = labelMetrica1;
    if (escalaFinal === 'BASE100') ytitle1 = `${labelMetrica1} (Indexado a 100)`;
    if (escalaFinal === 'VARIACAO') ytitle1 = `${labelMetrica1} (Variação % Acumulada)`;

    const layout = {
        barmode: 'group',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 40, b: 80, l: 70, r: metricasAtivas.length > 2 ? 60 : (metricasAtivas.length > 1 ? 75 : 20) },
        hovermode: 'x unified',
        xaxis: {
            gridcolor: 'rgba(255,255,255,0.06)',
            tickcolor: 'rgba(255,255,255,0.1)',
            tickfont: { color: 'var(--text-muted)' },
            showgrid: true,
            tickangle: -30
        },
        yaxis: {
            title: ytitle1,
            gridcolor: 'rgba(255,255,255,0.06)',
            tickcolor: 'rgba(255,255,255,0.1)',
            tickfont: { color: 'var(--text-muted)' },
            titlefont: { color: 'var(--text-muted)', size: 12 },
            showgrid: true,
            zeroline: true,
            zerolinecolor: 'rgba(255,255,255,0.12)'
        },
        legend: {
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: -0.22,
            font: { color: 'var(--text-secondary)', size: 11 }
        }
    };

    if (metricasAtivas.length > 1) {
        const labelMetrica2 = METRICAS_LABELS[metricasAtivas[1]] || metricasAtivas[1];
        let ytitle2 = labelMetrica2;
        if (escalaFinal === 'BASE100') ytitle2 = `${labelMetrica2} (Indexado a 100)`;
        if (escalaFinal === 'VARIACAO') ytitle2 = `${labelMetrica2} (Variação % Acumulada)`;

        layout.yaxis2 = {
            title: ytitle2,
            titlefont: { color: 'var(--text-muted)', size: 12 },
            tickfont: { color: 'var(--text-muted)' },
            overlaying: 'y',
            side: 'right',
            showgrid: false,
            zeroline: false
        };
    }

    if (metricasAtivas.length > 2) {  // 3ª métrica: eixo à direita, afastado do 2º (o gráfico encolhe para caber)
        const labelMetrica3 = METRICAS_LABELS[metricasAtivas[2]] || metricasAtivas[2];
        let ytitle3 = labelMetrica3;
        if (escalaFinal === 'BASE100') ytitle3 = `${labelMetrica3} (Indexado a 100)`;
        if (escalaFinal === 'VARIACAO') ytitle3 = `${labelMetrica3} (Variação % Acumulada)`;
        layout.xaxis.domain = [0, 0.93];  // 0,86 deixava os dois eixos da direita muito separados; 0,93 a pedido do usuário (14/10)
        layout.yaxis3 = {
            title: ytitle3,
            titlefont: { color: 'var(--text-muted)', size: 12 },
            tickfont: { color: 'var(--text-muted)' },
            overlaying: 'y',
            side: 'right',
            anchor: 'free',
            position: 1,
            showgrid: false,
            zeroline: false
        };
    }

    if (canvas) canvas.innerHTML = '';
    Plotly.newPlot('graficoComparativoEmpresasCanvas', traces, layout, { displayModeBar: true, scrollZoom: true, responsive: true });
};

// Drag & Drop do Modal Comparador de Empresas
document.addEventListener('mousedown', function (e) {
    if (e.target && e.target.closest('#modal-comparador-empresas-header')) {
        isDraggingComparadorEmpresasModal = true;
        comparadorEmpresasDragStartX = e.clientX - comparadorEmpresasCurrentX;
        comparadorEmpresasDragStartY = e.clientY - comparadorEmpresasCurrentY;
        document.body.style.userSelect = 'none';
    }
});

document.addEventListener('mousemove', function (e) {
    if (isDraggingComparadorEmpresasModal) {
        comparadorEmpresasCurrentX = e.clientX - comparadorEmpresasDragStartX;
        comparadorEmpresasCurrentY = e.clientY - comparadorEmpresasDragStartY;
        const modal = document.getElementById('modal-comparador-empresas-window');
        if (modal) {
            modal.style.transform = `translate(${comparadorEmpresasCurrentX}px, ${comparadorEmpresasCurrentY}px)`;
        }
    }
});

document.addEventListener('mouseup', function () {
    if (isDraggingComparadorEmpresasModal) {
        isDraggingComparadorEmpresasModal = false;
        document.body.style.userSelect = '';
    }
});

// Resize da Sidebar do Comparador de Empresas
document.addEventListener('mousedown', function(e) {
    if (e.target && e.target.id === 'comparador-empresas-resizer') {
        isResizingEmpresasSidebar = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }
});

document.addEventListener('mousemove', function(e) {
    if (isResizingEmpresasSidebar) {
        const sidebar = document.getElementById('comparador-empresas-sidebar');
        const windowEl = document.getElementById('modal-comparador-empresas-window');
        if (sidebar && windowEl) {
            const windowRect = windowEl.getBoundingClientRect();
            const relativeX = e.clientX - windowRect.left;
            // Limitar largura entre 180px e 450px
            const newWidth = Math.max(180, Math.min(450, relativeX));
            sidebar.style.width = newWidth + 'px';
            sidebar.style.minWidth = newWidth + 'px';
            
            // Reajustar Plotly
            Plotly.Plots.resize('graficoComparativoEmpresasCanvas');
        }
    }
});

document.addEventListener('mouseup', function() {
    if (isResizingEmpresasSidebar) {
        isResizingEmpresasSidebar = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
});


// =====================================================================
// SEÇÃO ÍNDICES & MACRO
// =====================================================================

// Mapeamento visual para os KPIs do Painel Macro
const INDICADORES_CONFIG = {
    'CDI': { label: 'CDI Acumulado', icon: '🏛️', suffix: '% a.a.', factor: 1, desc: 'Taxa diária anualizada equivalente' },
    'IPCA': { label: 'Inflação IPCA', icon: '📈', suffix: '% (Mensal)', factor: 1, desc: 'Variação mensal do IPCA acumulado oficial' },
    'IPCA_12M': { label: 'Inflação IPCA (12M)', icon: '📈', suffix: '% (12 meses)', factor: 1, desc: 'IPCA acumulado nos últimos 12 meses (composto)' },
    'DOLAR': { label: 'Dólar Comercial', icon: '💵', prefix: 'R$ ', suffix: '', factor: 1, desc: 'Cotação de venda do dólar comercial' },
    'IBOV': { label: 'Índice Bovespa', icon: '📊', suffix: ' pts', factor: 1, desc: 'Desempenho médio das ações da B3' },
    'BR05Y': { label: 'Taxa Prefixada 5A', icon: '⏳', suffix: '% a.a.', factor: 1, desc: 'Swap DI x Pré de 5 anos (SGS 7815)' },
    'BR10Y': { label: 'Taxa Prefixada 10A', icon: '⏳', suffix: '% a.a.', factor: 1, desc: 'Swap DI x Pré de 10 anos (SGS 25486)' },
    'JURO_REAL': { label: 'Juro Real Efetivo', icon: '💸', suffix: '% a.a.', factor: 1, desc: 'CDI Nominal deduzido o IPCA acumulado 12m' }
};

// Variação dos cards: taxas (CDI anualizado, juro real, prefixadas) em pontos percentuais; IPCA mensal e IPCA de 12 meses contra
// o mês anterior; dólar e Ibovespa em %. O período vem da série devolvida pela API (30 registros; IPCA e IPCA 12M, 12 meses).
const INDICADORES_MENSAIS = ['IPCA', 'IPCA_12M'];
const INDICADORES_EM_PP = ['CDI', 'JURO_REAL', 'BR05Y', 'BR10Y'];
const MESES_ABREV_MACRO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function _numeroMacro(valor, casas) {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function _diaMesMacro(iso) {
    const p = String(iso || '').split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}` : 'n/d';
}

function _mesAnoMacro(iso) {
    const p = String(iso || '').split('-');
    return p.length === 3 ? `${MESES_ABREV_MACRO[Number(p[1]) - 1]}/${p[0]}` : 'n/d';
}

function variacaoIndicadorMacro(nome, info) {
    const h = (info.historico || []).map(Number);
    const d = info.datas || [];
    if (h.length < 2) return { delta: 0, texto: 'sem histórico' };
    const sinal = (x) => (x >= 0 ? '+' : '−');
    if (INDICADORES_MENSAIS.includes(nome)) {
        const delta = h[h.length - 1] - h[h.length - 2];
        return { delta, texto: `${sinal(delta)}${_numeroMacro(Math.abs(delta), 2)} p.p. vs ${_mesAnoMacro(d[d.length - 2])}` };
    }
    const desde = `desde ${_diaMesMacro(d[0])}`;
    if (INDICADORES_EM_PP.includes(nome)) {
        const anual = nome === 'CDI' ? (v) => (Math.pow(1 + v / 100, 252) - 1) * 100 : (v) => v;
        const delta = anual(h[h.length - 1]) - anual(h[0]);
        return { delta, texto: `${sinal(delta)}${_numeroMacro(Math.abs(delta), 2)} p.p. ${desde}` };
    }
    const delta = h[h.length - 1] - h[0];
    const pct = h[0] !== 0 ? (delta / h[0]) * 100 : 0;
    const casas = nome === 'DOLAR' ? 4 : 0;
    return { delta, texto: `${sinal(delta)}${_numeroMacro(Math.abs(pct), 2)}% (${sinal(delta)}${_numeroMacro(Math.abs(delta), casas)}) ${desde}` };
}

async function carregarIndicadoresResumo() {
    const grid = document.getElementById('grid-indicadores-kpi');
    if (!grid) return;
    grid.innerHTML = '<div class="loading">Carregando painel macroeconômico...</div>';

    try {
        const resp = await fetch(`${API_BASE}/indicadores/resumo`);
        if (!resp.ok) throw new Error('Falha ao obter indicadores');
        const data = await resp.json();
        
        const resumo = data.resumo;
        grid.innerHTML = '';
        
        // Renderiza cada card de indicador na ordem lógica
        const ordem = ['CDI', 'IPCA', 'IPCA_12M', 'JURO_REAL', 'DOLAR', 'IBOV', 'BR05Y', 'BR10Y'];
        
        ordem.forEach(nome => {
            const info = resumo[nome];
            if (!info) return;
            
            const config = INDICADORES_CONFIG[nome] || { label: nome, icon: '📊', suffix: '', factor: 1, desc: '' };
            
            // CDI: a tabela guarda a taxa diária (% a.d.); o card mostra a taxa anual equivalente em 252 dias úteis
            // (mesma conta da view_historico_juro_real). Antes havia 14,15 fixo no código.
            let valorExibido = info.valor;
            if (nome === 'CDI') {
                valorExibido = (Math.pow(1 + info.valor / 100, 252) - 1) * 100;
            }
            
            // Formatação do valor do card
            let valorExibicaoStr = '';
            if (nome === 'IBOV') {
                valorExibicaoStr = (valorExibido).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + config.suffix;
            } else if (nome === 'DOLAR') {
                valorExibicaoStr = 'R$ ' + (valorExibido).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
            } else {
                valorExibicaoStr = (valorExibido * config.factor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + config.suffix;
            }
            
            // Tratar variação
            const variacao = variacaoIndicadorMacro(nome, info);
            const subiu = variacao.delta >= 0;
            const corVariacao = subiu ? 'var(--accent-green)' : 'var(--accent-red)';
            
            // Formatando data de referência (IPCA e IPCA 12M são mensais: mês/ano)
            let dataRef = 'n/d';
            try {
                const parts = info.data.split('-');
                dataRef = INDICADORES_MENSAIS.includes(nome) ? _mesAnoMacro(info.data) : `${parts[2]}/${parts[1]}/${parts[0]}`;
            } catch(e) {}
            
            const cardId = `card-macro-${nome}`;
            const sparklineId = `sparkline-${nome}`;
            
            const cardHtml = `
                <div id="${cardId}" style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between; min-height: 180px; transition: transform 0.2s, box-shadow 0.2s;" class="kpi-card" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 15px rgba(0,0,0,0.05)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.02)';" title="${config.desc}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <span style="font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">${config.label}</span>
                            <div style="font-size: 24px; font-weight: bold; color: var(--text-primary); margin-top: 4px;">${valorExibicaoStr}</div>
                        </div>
                        <div style="font-size: 24px; padding: 8px; background: var(--bg-primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">${config.icon}</div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid var(--border-glass); padding-top: 12px; margin-top: auto;">
                        <div>
                            <div style="font-size: 11px; color: var(--text-muted);">Ref: ${dataRef}</div>
                            <div style="font-size: 12px; font-weight: 600; color: ${corVariacao}; margin-top: 2px;">
                                ${subiu ? '▲' : '▼'} ${variacao.texto}
                            </div>
                        </div>
                        <!-- Sparkline -->
                        <div id="${sparklineId}" style="width: 110px; height: 45px;"></div>
                    </div>
                </div>
            `;
            
            grid.insertAdjacentHTML('beforeend', cardHtml);
            
            // Plotar Sparkline no Plotly de forma minimalista
            setTimeout(() => {
                const trace = {
                    x: info.datas,
                    y: info.historico,
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: subiu ? '#16a34a' : '#dc2626',
                        width: 2
                    },
                    fill: 'tozeroy',
                    fillcolor: subiu ? 'rgba(22, 163, 74, 0.04)' : 'rgba(220, 38, 38, 0.04)',
                    hoverinfo: 'none'
                };
                
                const layout = {
                    margin: { t: 2, b: 2, l: 2, r: 2 },
                    xaxis: { visible: false, showgrid: false },
                    yaxis: { visible: false, showgrid: false },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    showlegend: false
                };
                
                Plotly.newPlot(sparklineId, [trace], layout, { displayModeBar: false, staticPlot: true });
            }, 50);
        });

    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Erro ao carregar o painel macroeconômico. Tente novamente mais tarde.</div>';
    }
}

async function carregarIndicadoresJuroReal() {
    const dias = document.getElementById('seletor-dias-juro').value;
    const graficoDiv = document.getElementById('grafico-juro-real');
    const tabelaBody = document.getElementById('tabela-juro-real-body');
    
    if (graficoDiv) graficoDiv.innerHTML = '<div class="loading">Buscando séries temporais...</div>';
    if (tabelaBody) tabelaBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Buscando histórico...</td></tr>';
    
    try {
        const resp = await fetch(`${API_BASE}/indicadores/juro-real?dias=${dias}`);
        if (!resp.ok) throw new Error('Falha ao obter histórico de juro real');
        const dados = await resp.json();
        
        if (dados.length === 0) {
            if (graficoDiv) graficoDiv.innerHTML = '<div style="text-align:center; padding: 20px;">Nenhum dado encontrado.</div>';
            return;
        }

        // 1. Plotar Gráfico Plotly
        const datas = dados.map(d => d.data_referencia);
        const nominal = dados.map(d => d.juro_nominal_aa);
        const ipca = dados.map(d => d.ipca_acumulado_12m);
        const real = dados.map(d => d.juro_real_efetivo_aa);

        const traces = [
            {
                x: datas,
                y: nominal,
                name: 'CDI Nominal (a.a.)',
                type: 'scatter',
                mode: 'lines',
                line: { color: '#8b5cf6', width: 2.5 }
            },
            {
                x: datas,
                y: ipca,
                name: 'IPCA Acumulado 12m',
                type: 'scatter',
                mode: 'lines',
                line: { color: '#f59e0b', width: 2.5 }
            },
            {
                x: datas,
                y: real,
                name: 'Juro Real Efetivo (a.a.)',
                type: 'scatter',
                mode: 'lines',
                line: { color: '#10b981', width: 3 },
                fill: 'tozeroy',
                fillcolor: 'rgba(16, 185, 129, 0.04)'
            }
        ];

        const layout = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            margin: { t: 10, b: 50, l: 50, r: 20 },
            hovermode: 'x unified',
            xaxis: {
                gridcolor: 'var(--border-glass)',
                tickfont: { color: 'var(--text-secondary)' },
                showgrid: true
            },
            yaxis: {
                title: 'Taxa (% a.a.)',
                gridcolor: 'var(--border-glass)',
                tickfont: { color: 'var(--text-secondary)' },
                titlefont: { color: 'var(--text-muted)', size: 12 },
                showgrid: true,
                ticksuffix: '%'
            },
            legend: {
                orientation: 'h',
                x: 0.5,
                xanchor: 'center',
                y: -0.15,
                font: { color: 'var(--text-primary)', size: 12 }
            }
        };

        if (graficoDiv) graficoDiv.innerHTML = '';
        Plotly.newPlot('grafico-juro-real', traces, layout, { displayModeBar: true, responsive: true });

        // 2. Preencher Tabela Histórica (Ordem Decrescente de data)
        const dadosOrdenadosDesc = [...dados].reverse();
        tabelaBody.innerHTML = dadosOrdenadosDesc.map(row => {
            let dataRef = row.data_referencia;
            try {
                const parts = row.data_referencia.split('-');
                dataRef = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } catch(e) {}
            
            return `
                <tr style="border-bottom: 1px solid var(--border-glass); hover: background-color: var(--bg-primary);">
                    <td style="padding: 10px 8px;">${dataRef}</td>
                    <td style="padding: 10px 8px; text-align: right; font-weight: 500;">${row.juro_nominal_aa.toFixed(2)}%</td>
                    <td style="padding: 10px 8px; text-align: right; font-weight: 500; color: #f59e0b;">${row.ipca_acumulado_12m.toFixed(4)}%</td>
                    <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: #10b981;">${row.juro_real_efetivo_aa.toFixed(4)}%</td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
        if (graficoDiv) graficoDiv.innerHTML = `<div style="color:red; text-align:center; padding: 20px;">Erro ao carregar o gráfico.</div>`;
        if (tabelaBody) tabelaBody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center; padding: 20px;">Falha ao carregar tabela.</td></tr>`;
    }
}

// Armazena dados de ETFs na sessão
let cacheETFsData = [];

async function carregarIndicadoresCurva() {
    const diasCurva = document.getElementById('seletor-dias-curva').value;
    const diasETFs = document.getElementById('seletor-dias-etfs').value;
    
    const divCurva = document.getElementById('grafico-curva-juros');
    const divSpread = document.getElementById('grafico-spread-juros');
    const divETFs = document.getElementById('grafico-comparativo-etfs');
    
    if (divCurva) divCurva.innerHTML = '<div class="loading">Carregando curva de juros...</div>';
    if (divSpread) divSpread.innerHTML = '<div class="loading">Carregando spread...</div>';
    if (divETFs) divETFs.innerHTML = '<div class="loading">Carregando comparação de ETFs...</div>';
    
    const layoutTaxas = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 20, b: 40, l: 45, r: 15 },
        hovermode: 'x unified',
        xaxis: { gridcolor: 'var(--border-glass)', tickfont: { color: 'var(--text-secondary)' }, showgrid: true },
        yaxis: { title: 'Taxa (% a.a.)', gridcolor: 'var(--border-glass)', tickfont: { color: 'var(--text-secondary)' }, showgrid: true, ticksuffix: '%' },
        legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.22, font: { color: 'var(--text-primary)', size: 11 } }
    };
    
    const layoutSpread = {
        showlegend: true,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 20, b: 40, l: 45, r: 15 },
        hovermode: 'x unified',
        xaxis: { gridcolor: 'var(--border-glass)', tickfont: { color: 'var(--text-secondary)' }, showgrid: true },
        yaxis: { title: 'Spread (% a.a.)', gridcolor: 'var(--border-glass)', tickfont: { color: 'var(--text-secondary)' }, showgrid: true, ticksuffix: '%' },
        legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.22, font: { color: 'var(--text-primary)', size: 11 } }
    };

    // 1. Carregar Curva de Juros (Diária ou Mensal Suavizada se for Desde 2010)
    try {
        const urlFetch = diasCurva === '5000' 
            ? `${API_BASE}/indicadores/curva-juros-mensal` 
            : `${API_BASE}/indicadores/curva-juros?dias=${diasCurva}`;
            
        const resp = await fetch(urlFetch);
        if (!resp.ok) throw new Error('Falha ao obter dados de curva de juros');
        const dados = await resp.json();
        
        if (dados.length > 0) {
            const datas = dados.map(d => d.data_referencia);
            const br05y = dados.map(d => d.taxa_05y);
            const br10y = dados.map(d => d.taxa_10y);
            const cdi = dados.map(d => d.cdi_anual);
            const spread = dados.map(d => d.spread);
            
            // Gráfico de taxas
            const tracesTaxas = [
                {
                    x: datas,
                    y: cdi,
                    name: 'CDI (Benchmark Selic)',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#8b5cf6', width: 2, dash: 'dash' }
                },
                {
                    x: datas,
                    y: br05y,
                    name: 'BR05Y (Tesouro 5A)',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#3b82f6', width: 2.5 }
                },
                {
                    x: datas,
                    y: br10y,
                    name: 'BR10Y (Tesouro 10A)',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#f97316', width: 2.5 }
                }
            ];
            
            // Gráfico do spread
            const tracesSpread = [
                {
                    x: datas,
                    y: spread,
                    name: 'Spread (Juros 10A - 5A) - Diferença entre Juros Longos e Médios',
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#a855f7', width: 3 },
                    fill: 'tozeroy',
                    fillcolor: 'rgba(168, 85, 247, 0.04)'
                }
            ];
            
            if (divCurva) divCurva.innerHTML = '';
            Plotly.newPlot('grafico-curva-juros', tracesTaxas, layoutTaxas, { displayModeBar: true, responsive: true });
            
            if (divSpread) divSpread.innerHTML = '';
            Plotly.newPlot('grafico-spread-juros', tracesSpread, layoutSpread, { displayModeBar: true, responsive: true });
        } else {
            if (divCurva) divCurva.innerHTML = '<div style="text-align:center; padding: 20px;">Sem dados de taxas prefixadas.</div>';
            if (divSpread) divSpread.innerHTML = '<div style="text-align:center; padding: 20px;">Sem dados de spread.</div>';
        }
    } catch (e) {
        console.error(e);
        if (divCurva) divCurva.innerHTML = '<div style="color:red; text-align:center; padding: 20px;">Erro ao carregar curva de juros.</div>';
        if (divSpread) divSpread.innerHTML = '<div style="color:red; text-align:center; padding: 20px;">Erro ao carregar spread.</div>';
    }

    // 2. Carregar e Comparar ETFs de Renda Fixa
    try {
        const resp = await fetch(`${API_BASE}/indicadores/etfs-renda-fixa?dias=${diasETFs}`);
        if (!resp.ok) throw new Error('Falha ao obter dados de ETFs de Renda Fixa');
        cacheETFsData = await resp.json();
        
        // Renderizar checkboxes se o container estiver vazio
        const container = document.getElementById('checkboxes-etfs-container');
        if (container && !container.querySelector('input')) {
            const tickersUnicos = [...new Set(cacheETFsData.map(d => d.codneg))].sort();
            const defaultSelected = ['IMAB11', 'B5P211', 'LFTS11', 'IRFM11', 'FIXA11'];
            
            container.innerHTML = tickersUnicos.map(ticker => {
                const checked = defaultSelected.includes(ticker) ? 'checked' : '';
                return `
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-primary); cursor: pointer; padding: 4px;">
                        <input type="checkbox" value="${ticker}" ${checked} onchange="plotarETFs()" style="cursor: pointer;">
                        <span>${ticker}</span>
                    </label>
                `;
            }).join('');
        }
        
        plotarETFs();
    } catch (e) {
        console.error(e);
        if (divETFs) divETFs.innerHTML = '<div style="color:red; text-align:center; padding: 20px;">Erro ao carregar comparação de ETFs.</div>';
    }
}

function plotarETFs() {
    const divETFs = document.getElementById('grafico-comparativo-etfs');
    if (!divETFs || !cacheETFsData || cacheETFsData.length === 0) return;
    
    // Obter checkboxes selecionados
    const checkboxes = document.querySelectorAll('#checkboxes-etfs-container input[type="checkbox"]:checked');
    const selecionados = Array.from(checkboxes).map(c => c.value);
    
    if (selecionados.length === 0) {
        divETFs.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Selecione ao menos um ETF de Renda Fixa acima para visualizar.</div>';
        return;
    }
    
    // Agrupar dados
    const dadosAgrupados = {};
    cacheETFsData.forEach(item => {
        if (!selecionados.includes(item.codneg)) return;
        if (!dadosAgrupados[item.codneg]) dadosAgrupados[item.codneg] = [];
        dadosAgrupados[item.codneg].push(item);
    });
    
    const traces = [];
    
    selecionados.forEach(ticker => {
        const serie = dadosAgrupados[ticker] || [];
        if (serie.length === 0) return;
        
        // Ordena cronologicamente
        serie.sort((a, b) => new Date(a.data) - new Date(b.data));
        
        const preco0 = parseFloat(serie[0].preco);
        if (preco0 === 0) return;
        
        const x = [];
        const y = [];
        
        serie.forEach(pt => {
            const preco = parseFloat(pt.preco);
            const retorno = ((preco / preco0) - 1) * 100;
            x.push(pt.data);
            y.push(retorno);
        });
        
        traces.push({
            x: x,
            y: y,
            name: ticker,
            type: 'scatter',
            mode: 'lines',
            line: { width: 2 }
        });
    });
    
    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 15, b: 40, l: 45, r: 15 },
        hovermode: 'x unified',
        xaxis: { gridcolor: 'var(--border-glass)', tickfont: { color: 'var(--text-secondary)' }, showgrid: true },
        yaxis: { title: 'Retorno Acumulado (%)', gridcolor: 'var(--border-glass)', tickfont: { color: 'var(--text-secondary)' }, showgrid: true, ticksuffix: '%' },
        legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.18, font: { color: 'var(--text-primary)', size: 11 } }
    };
    
    divETFs.innerHTML = '';
    Plotly.newPlot('grafico-comparativo-etfs', traces, layout, { displayModeBar: true, responsive: true });
}

function selecionarTodosETFs(selecionar) {
    const checkboxes = document.querySelectorAll('#checkboxes-etfs-container input[type="checkbox"]');
    checkboxes.forEach(c => c.checked = selecionar);
    plotarETFs();
}
