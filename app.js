const supabaseUrl = 'https://vwzcdfgbqaszhqlvewch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3emNkZmdicWFzemhxbHZld2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDc4MTgsImV4cCI6MjA5MjYyMzgxOH0.SBEcDqvAkpvxyVV2eSxuvYt-0Ehst5B0_dxI9u0eTRQ';

if (window.supabase) window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- GLOBAL BADGE HELPER ---
window.formatTitlesToBadges = function(titleString) {
    if (!titleString || titleString.trim() === '') return '<span class="badge badge-none">None</span>';
    const titles = titleString.split(',').map(t => t.trim());
    const badgesHtml = titles.map(t => {
        let badgeClass = 'badge-default';
        const upperT = t.toUpperCase();
        if (upperT === 'GM') badgeClass = 'badge-gm';
        else if (upperT === 'IM') badgeClass = 'badge-im';
        else if (['FM', 'FA', 'IA', 'FI', 'AIM', 'NI', 'SNA'].includes(upperT)) badgeClass = 'badge-fm';
        else if (upperT === 'CM') badgeClass = 'badge-cm';
        return `<span class="badge ${badgeClass}">${t}</span>`;
    }).join('');
    return `<div class="title-badges-container">${badgesHtml}</div>`;
};

// --- CUSTOM MODAL SYSTEM ---
function initModalSystem() {
    if(document.getElementById('custom-modal-overlay')) return;
    const modalHTML = `<div id="custom-modal-overlay" class="custom-modal-overlay"><div id="custom-modal" class="custom-modal"><div id="custom-modal-header" class="custom-modal-header"><h3 id="custom-modal-title">Notice</h3><button class="close-modal-btn" onclick="closeModal()">×</button></div><div id="custom-modal-body" class="custom-modal-body"></div><div id="custom-modal-footer" class="custom-modal-footer"></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
window.showModal = function(title, bodyHTML, footerHTML) { initModalSystem(); document.getElementById('custom-modal-title').innerText = title; document.getElementById('custom-modal-body').innerHTML = bodyHTML; document.getElementById('custom-modal-footer').innerHTML = footerHTML; document.getElementById('custom-modal-overlay').classList.add('active'); }
window.closeModal = function() { const overlay = document.getElementById('custom-modal-overlay'); if(overlay) overlay.classList.remove('active'); }
window.uiAlert = function(title, message, isError = false) { const icon = isError ? '❌' : '✅'; const color = isError ? '#ef4444' : '#10b981'; const body = `<div style="display:flex; align-items:center; gap:12px;"><span style="font-size:1.8rem; line-height:1;">${icon}</span><span style="color:${color}; font-weight:600; font-size:1rem;">${message}</span></div>`; const footer = `<button class="modal-btn modal-btn-confirm" onclick="closeModal()">Got it</button>`; window.showModal(title, body, footer); }
window.uiConfirm = function(title, message, confirmBtnText, onConfirm) { const body = `<p style="font-size:1rem; color:#334155;">${message}</p>`; window._tempConfirm = () => { window.closeModal(); if(onConfirm) onConfirm(); }; const footer = `<button class="modal-btn modal-btn-cancel" onclick="closeModal()">Cancel</button><button class="modal-btn modal-btn-danger" onclick="window._tempConfirm()">${confirmBtnText}</button>`; window.showModal(title, body, footer); }

// --- AUTH & NAVBAR ---
async function updateNavbar() {
    const nav = document.getElementById('main-nav');
    if (!nav) return; 
    const baseLinks = `<a href="#">Tournaments</a><a href="#">Rankings</a>`;
    if (!window.supabaseClient) { nav.innerHTML = baseLinks + `<div style="display: flex; align-items: center; gap: 1rem; border-left: 1px solid var(--border-color); padding-left: 1rem; margin-left: 0.5rem;"><a href="login.html" class="nav-auth-btn">Log In</a><a href="signup.html" class="btn-orange" style="padding: 0.6rem 1.2rem;">Sign Up</a></div>`; return; }
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            const { data: profile } = await window.supabaseClient.from('profiles').select('is_admin').eq('id', session.user.id).single();
            let adminLink = "";
            if (profile && profile.is_admin) adminLink = `<a href="admin.html" style="color: var(--accent-orange);">Admin Panel</a>`;
            nav.innerHTML = baseLinks + adminLink + `<a href="#" onclick="handleLogout()" class="nav-auth-btn" style="color: #E74C3C; border-left: 1px solid var(--border-color); padding-left: 1.5rem; margin-left: 0.5rem;">Logout</a>`;
        } else { nav.innerHTML = baseLinks + `<div style="display: flex; align-items: center; gap: 1rem; border-left: 1px solid var(--border-color); padding-left: 1rem; margin-left: 0.5rem;"><a href="login.html" class="nav-auth-btn">Log In</a><a href="signup.html" class="btn-orange" style="padding: 0.6rem 1.2rem;">Sign Up</a></div>`; }
    } catch (error) { nav.innerHTML = baseLinks + `<a href="login.html" class="nav-auth-btn">Log In</a>`; }
}
window.handleLogout = async function() { if (!window.supabaseClient) return; await window.supabaseClient.auth.signOut(); window.location.href = 'index.html'; }
window.verifyAdminAccess = async function() { if (!window.supabaseClient) return { allowed: false, error: "Offline." }; const { data: { session } } = await window.supabaseClient.auth.getSession(); if (!session) return { allowed: false }; const { data: profile, error } = await window.supabaseClient.from('profiles').select('*').eq('id', session.user.id).single(); if (error || !profile || !profile.is_admin) return { allowed: false, error: "Access Denied." }; return { allowed: true, is_super_admin: profile.is_super_admin, email: profile.email }; }

// ==========================================
// ACTIVE PLAYERS ENGINE (WITH PAGINATION)
// ==========================================
window.currentPlayersList = [];
window.activePage = 1;
window.activePageSize = 10;
window.activeSearchQuery = "";
window.activeTbodyId = "";
window.activeIsAdmin = false;

// 1. Fetch from Database
window.fetchPlayers = async function(tableBodyId, isAdmin = false) {
    window.activeTbodyId = tableBodyId;
    window.activeIsAdmin = isAdmin;
    if (!window.supabaseClient) return;

    const { data: players, error } = await window.supabaseClient.from('players').select('*').order('fide_rating', { ascending: false });
    if (error) return; 
    
    window.currentPlayersList = players;
    window.renderActiveTable();
}

// 2. Render HTML & Pagination
window.renderActiveTable = function() {
    const tbody = document.getElementById(window.activeTbodyId);
    if (!tbody) return;

    // Filter data based on search bar
    let filtered = window.currentPlayersList.filter(p => {
        const searchStr = `${p.first_name} ${p.last_name || ''} ${p.state_id || ''} ${p.fide_id || ''} ${p.title || ''}`.toLowerCase();
        return searchStr.includes(window.activeSearchQuery);
    });

    // Pagination Math
    const totalPages = Math.ceil(filtered.length / window.activePageSize) || 1;
    if (window.activePage > totalPages) window.activePage = totalPages;
    const start = (window.activePage - 1) * window.activePageSize;
    const paginated = filtered.slice(start, start + window.activePageSize);

    tbody.innerHTML = ''; 
    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${window.activeIsAdmin ? 4 : 5}" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching active players found.</td></tr>`;
    } else {
        paginated.forEach(player => {
            const tr = document.createElement('tr');
            const fullName = `${player.first_name} ${player.last_name || ''}`.trim();
            const displayStateId = player.state_id ? `<span class="data-id">${player.state_id}</span>` : '<span class="data-unrated">Pending</span>';
            const displayFideId = player.fide_id ? `<span class="data-id">${player.fide_id}</span>` : '-';
            const displayRating = player.fide_rating ? `<span class="data-rating">${player.fide_rating}</span>` : '<span class="data-unrated">Unrated</span>';
            const displayTitle = window.formatTitlesToBadges(player.title);

            if (window.activeIsAdmin) {
                tr.innerHTML = `<td><div class="player-name">👤 ${fullName}</div></td><td>${displayStateId}</td><td>${displayRating}</td><td><div style="display:flex; gap:0.5rem;"><button onclick="openEditModal('${player.id}')" class="action-btn promote">Edit</button><button onclick="deletePlayer('${player.id}')" class="action-btn delete">Delete</button></div></td>`;
            } else {
                tr.innerHTML = `<td><div class="player-name">${fullName}</div></td><td>${displayStateId}</td><td>${displayFideId}</td><td>${displayRating}</td><td>${displayTitle}</td>`;
            }
            tbody.appendChild(tr);
        });
    }

    // Update the Pagination Buttons in HTML
    const pageInfo = document.getElementById('active-page-info');
    const btnPrev = document.getElementById('active-prev');
    const btnNext = document.getElementById('active-next');
    
    if(pageInfo) pageInfo.innerText = `Page ${window.activePage} of ${totalPages}`;
    if(btnPrev) btnPrev.disabled = (window.activePage === 1);
    if(btnNext) btnNext.disabled = (window.activePage === totalPages);
}

// 3. Change Page Action
window.changeActivePage = function(direction) {
    window.activePage += direction;
    window.renderActiveTable();
}

// --- GLOBAL SEARCH ENGINE ---
// This listens to the main search bar and filters BOTH databases
window.handleGlobalSearch = function() {
    const input = document.getElementById("searchInput");
    if(!input) return;
    
    const query = input.value.toLowerCase().trim();
    
    // Apply search to Active Players
    window.activeSearchQuery = query;
    window.activePage = 1; // Reset to page 1 on new search
    if (window.currentPlayersList.length > 0) window.renderActiveTable();

    // Apply search to Historical Players (if players.js is loaded)
    if (window.currentAllTimePlayersList && window.renderAllTimeTable) {
        window.atSearchQuery = query;
        window.atPage = 1;
        window.renderAllTimeTable();
    }
}

// --- ACTIVE MODAL & CRUD LOGIC ---
window.openEditModal = function(id) {
    const player = window.currentPlayersList.find(p => p.id === id);
    if(!player) return window.uiAlert('Error', 'Not found locally.', true);
    const bodyHTML = `<div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;"><div class="form-group" style="margin:0;"><label>First Name</label><input type="text" id="edit_first" value="${player.first_name}"></div><div class="form-group" style="margin:0;"><label>Last Name</label><input type="text" id="edit_last" value="${player.last_name}"></div><div class="form-group" style="margin:0;"><label>State ID</label><input type="text" id="edit_state" value="${player.state_id}"></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;"><div class="form-group" style="margin:0;"><label>FIDE ID</label><input type="text" id="edit_fide" value="${player.fide_id || ''}"></div><div class="form-group" style="margin:0;"><label>FIDE Rating</label><input type="number" id="edit_rating" value="${player.fide_rating || ''}"></div></div><div class="form-group" style="margin:0;"><label>Titles</label><input type="text" id="edit_title" value="${player.title || ''}"></div></div>`;
    window._tempSaveEdit = async () => {
        const updateData = { first_name: document.getElementById('edit_first').value.trim(), last_name: document.getElementById('edit_last').value.trim(), state_id: document.getElementById('edit_state').value.trim(), fide_id: document.getElementById('edit_fide').value.trim() || null, fide_rating: document.getElementById('edit_rating').value || null, title: document.getElementById('edit_title').value.trim() || null };
        const { error } = await window.supabaseClient.from('players').update(updateData).eq('id', id);
        if(error) window.uiAlert('Failed', error.message, true);
        else { window.closeModal(); window.uiAlert('Success', 'Record updated.'); window.fetchPlayers(window.activeTbodyId, window.activeIsAdmin); }
    };
    window.showModal('✏️ Edit Active Player', bodyHTML, `<button class="modal-btn modal-btn-cancel" onclick="closeModal()">Cancel</button><button class="modal-btn modal-btn-confirm" onclick="window._tempSaveEdit()">Save</button>`);
}

window.addPlayer = async function(event) {
    event.preventDefault(); 
    if (!window.supabaseClient) return;
    const newPlayer = { first_name: document.getElementById('first_name').value.trim(), last_name: document.getElementById('last_name').value.trim(), state_id: document.getElementById('state_id').value.trim(), fide_id: document.getElementById('fide_id').value.trim() || null, fide_rating: document.getElementById('fide_rating').value || null, title: document.getElementById('title').value || null };
    const { error } = await window.supabaseClient.from('players').insert([newPlayer]);
    if (error) window.uiAlert('System Error', error.message, true);
    else { window.uiAlert('Success', 'Player saved!'); document.getElementById('add-player-form').reset(); window.fetchPlayers(window.activeTbodyId, window.activeIsAdmin); }
}

window.deletePlayer = async function(id) {
    if (!window.supabaseClient) return;
    window.uiConfirm('⚠️ Delete?', 'Remove this active player?', 'Delete', async () => {
        await window.supabaseClient.from('players').delete().eq('id', id);
        window.fetchPlayers(window.activeTbodyId, window.activeIsAdmin); 
        window.uiAlert('Deleted', 'Player removed.');
    });
}
