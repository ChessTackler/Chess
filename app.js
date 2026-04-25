const supabaseUrl = 'https://vwzcdfgbqaszhqlvewch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3emNkZmdicWFzemhxbHZld2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDc4MTgsImV4cCI6MjA5MjYyMzgxOH0.SBEcDqvAkpvxyVV2eSxuvYt-0Ehst5B0_dxI9u0eTRQ';

if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
    console.error("Supabase CDN not loaded.");
}

// Global state to store players locally for fast editing
window.currentPlayersList = [];

// --- CUSTOM MODAL UI SYSTEM ---
function initModalSystem() {
    if(document.getElementById('custom-modal-overlay')) return;
    const modalHTML = `
    <div id="custom-modal-overlay" class="custom-modal-overlay">
        <div id="custom-modal" class="custom-modal">
            <div id="custom-modal-header" class="custom-modal-header">
                <h3 id="custom-modal-title">Notice</h3>
                <button class="close-modal-btn" onclick="closeModal()">×</button>
            </div>
            <div id="custom-modal-body" class="custom-modal-body"></div>
            <div id="custom-modal-footer" class="custom-modal-footer"></div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showModal(title, bodyHTML, footerHTML) {
    initModalSystem();
    document.getElementById('custom-modal-title').innerText = title;
    document.getElementById('custom-modal-body').innerHTML = bodyHTML;
    document.getElementById('custom-modal-footer').innerHTML = footerHTML;
    document.getElementById('custom-modal-overlay').classList.add('active');
}

window.closeModal = function() {
    const overlay = document.getElementById('custom-modal-overlay');
    if(overlay) overlay.classList.remove('active');
}

window.uiAlert = function(title, message, isError = false) {
    const icon = isError ? '❌' : '✅';
    const color = isError ? '#ef4444' : '#10b981';
    const body = `
        <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:1.8rem; line-height:1;">${icon}</span>
            <span style="color:${color}; font-weight:600; font-size:1rem;">${message}</span>
        </div>`;
    const footer = `<button class="modal-btn modal-btn-confirm" onclick="closeModal()">Got it</button>`;
    showModal(title, body, footer);
}

window.uiConfirm = function(title, message, confirmBtnText, onConfirm) {
    const body = `<p style="font-size:1rem; color:#334155;">${message}</p>`;
    window._tempConfirm = () => { closeModal(); if(onConfirm) onConfirm(); };
    const footer = `
        <button class="modal-btn modal-btn-cancel" onclick="closeModal()">Cancel</button>
        <button class="modal-btn modal-btn-danger" onclick="window._tempConfirm()">${confirmBtnText}</button>
    `;
    showModal(title, body, footer);
}

// --- DYNAMIC NAVBAR RENDERING ---
async function updateNavbar() {
    const nav = document.getElementById('main-nav');
    if (!nav) return; 
    const baseLinks = `<a href="#">Tournaments</a><a href="#">Rankings</a>`;

    if (!window.supabaseClient) {
        nav.innerHTML = baseLinks + `
            <div style="display: flex; align-items: center; gap: 1rem; border-left: 1px solid var(--border-color); padding-left: 1rem; margin-left: 0.5rem;">
                <a href="login.html" class="nav-auth-btn">Log In</a>
                <a href="signup.html" class="btn-orange" style="padding: 0.6rem 1.2rem;">Sign Up</a>
            </div>
        `;
        return;
    }

    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            const { data: profile } = await window.supabaseClient.from('profiles').select('is_admin').eq('id', session.user.id).single();
            let adminLink = "";
            if (profile && profile.is_admin) {
                adminLink = `
                    <a href="admin.html" style="color: var(--accent-orange);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 4px;">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        Admin Panel
                    </a>`;
            }
            nav.innerHTML = baseLinks + adminLink + `<a href="#" onclick="handleLogout()" class="nav-auth-btn" style="color: #E74C3C; border-left: 1px solid var(--border-color); padding-left: 1.5rem; margin-left: 0.5rem;">Logout</a>`;
        } else {
            nav.innerHTML = baseLinks + `
                <div style="display: flex; align-items: center; gap: 1rem; border-left: 1px solid var(--border-color); padding-left: 1rem; margin-left: 0.5rem;">
                    <a href="login.html" class="nav-auth-btn">Log In</a>
                    <a href="signup.html" class="btn-orange" style="padding: 0.6rem 1.2rem;">Sign Up</a>
                </div>`;
        }
    } catch (error) { nav.innerHTML = baseLinks + `<a href="login.html" class="nav-auth-btn">Log In</a>`; }
}

async function handleLogout() {
    if (!window.supabaseClient) return;
    await window.supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

async function verifyAdminAccess() {
    if (!window.supabaseClient) return { allowed: false, error: "Database offline." };
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return { allowed: false };
    const { data: profile, error } = await window.supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
    if (error || !profile || !profile.is_admin) return { allowed: false, error: "Access Denied: You do not have Admin privileges." };
    return { allowed: true, is_super_admin: profile.is_super_admin, email: profile.email };
}

// --- DATABASE OPERATIONS (Players) ---
async function fetchPlayers(tableBodyId, isAdmin = false) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody || !window.supabaseClient) return;

    const { data: players, error } = await window.supabaseClient.from('players').select('*').order('fide_rating', { ascending: false });
    if (error) return; 

    window.currentPlayersList = players; // Save globally for the edit form
    tbody.innerHTML = ''; 

    if (players.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 4 : 5}" style="text-align: center; color: var(--text-muted); padding: 2rem;">No players found in database.</td></tr>`;
        return;
    }

    players.forEach(player => {
        const tr = document.createElement('tr');
        if (isAdmin) {
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--text-dark);">${player.first_name} ${player.last_name}</td>
                <td>${player.state_id}</td>
                <td style="font-weight: 600;">${player.fide_rating || '<span style="color:var(--text-muted); font-weight:400;">Unrated</span>'}</td>
                <td>
                    <div style="display:flex; gap:0.5rem;">
                        <button onclick="openEditModal('${player.id}')" class="action-btn promote" style="padding: 0.4rem 0.6rem;">Edit</button>
                        <button onclick="deletePlayer('${player.id}')" class="action-btn delete" style="padding: 0.4rem 0.6rem;">Delete</button>
                    </div>
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--primary-blue);">${player.first_name} ${player.last_name}</td>
                <td>${player.state_id}</td>
                <td>${player.fide_id || '-'}</td>
                <td style="font-weight: 700; color: var(--accent-orange);">${player.fide_rating || 'Unrated'}</td>
                <td><span style="background: var(--bg-light); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">${player.title || 'None'}</span></td>
            `;
        }
        tbody.appendChild(tr);
    });
}

// --- EDIT PLAYER LOGIC ---
window.openEditModal = function(id) {
    const player = window.currentPlayersList.find(p => p.id === id);
    if(!player) return uiAlert('Error', 'Player data not found locally.', true);

    const bodyHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
            <div class="form-group" style="margin:0;"><label>First Name</label><input type="text" id="edit_first" value="${player.first_name}" style="background:#fff;"></div>
            <div class="form-group" style="margin:0;"><label>Last Name</label><input type="text" id="edit_last" value="${player.last_name}" style="background:#fff;"></div>
            <div class="form-group" style="margin:0;"><label>State ID</label><input type="text" id="edit_state" value="${player.state_id}" style="background:#fff;"></div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div class="form-group" style="margin:0;"><label>FIDE ID</label><input type="text" id="edit_fide" value="${player.fide_id || ''}" style="background:#fff;"></div>
                <div class="form-group" style="margin:0;"><label>FIDE Rating</label><input type="number" id="edit_rating" value="${player.fide_rating || ''}" style="background:#fff;"></div>
            </div>
            <div class="form-group" style="margin:0;">
                <label>Title</label>
                <select id="edit_title" style="background:#fff; width:100%; padding:0.8rem; border-radius:8px; border:1px solid var(--border-color); outline:none;">
                    <option value="" ${player.title===''?'selected':''}>None</option>
                    <option value="CM" ${player.title==='CM'?'selected':''}>CM</option>
                    <option value="FM" ${player.title==='FM'?'selected':''}>FM</option>
                    <option value="IM" ${player.title==='IM'?'selected':''}>IM</option>
                    <option value="GM" ${player.title==='GM'?'selected':''}>GM</option>
                </select>
            </div>
        </div>
    `;

    window._tempSaveEdit = async () => {
        const updateData = {
            first_name: document.getElementById('edit_first').value,
            last_name: document.getElementById('edit_last').value,
            state_id: document.getElementById('edit_state').value,
            fide_id: document.getElementById('edit_fide').value || null,
            fide_rating: document.getElementById('edit_rating').value || null,
            title: document.getElementById('edit_title').value || null
        };
        const { error } = await window.supabaseClient.from('players').update(updateData).eq('id', id);
        if(error) {
            uiAlert('Update Failed', error.message, true);
        } else {
            closeModal();
            uiAlert('Success', 'Player record has been updated.');
            fetchPlayers('admin-table-body', true);
        }
    };

    const footerHTML = `
        <button class="modal-btn modal-btn-cancel" onclick="closeModal()">Cancel</button>
        <button class="modal-btn modal-btn-confirm" onclick="window._tempSaveEdit()">Save Changes</button>
    `;
    showModal('✏️ Edit Player Data', bodyHTML, footerHTML);
}

// --- ADD & DELETE LOGIC ---
async function addPlayer(event) {
    event.preventDefault(); 
    if (!window.supabaseClient) return uiAlert("Offline", "Cannot connect to database.", true);

    const newPlayer = {
        first_name: document.getElementById('first_name').value,
        last_name: document.getElementById('last_name').value,
        state_id: document.getElementById('state_id').value,
        fide_id: document.getElementById('fide_id').value || null,
        fide_rating: document.getElementById('fide_rating').value || null,
        title: document.getElementById('title').value || null
    };
    
    const { error } = await window.supabaseClient.from('players').insert([newPlayer]);
    if (error) {
        uiAlert('System Error', error.message, true);
    } else { 
        uiAlert('Database Updated', 'Player has been saved successfully!'); 
        document.getElementById('add-player-form').reset(); 
        fetchPlayers('admin-table-body', true); 
    }
}

async function deletePlayer(id) {
    if (!window.supabaseClient) return;
    uiConfirm('⚠️ Delete Permanently?', 'Are you sure you want to remove this player? This action cannot be undone.', 'Delete Player', async () => {
        await window.supabaseClient.from('players').delete().eq('id', id);
        fetchPlayers('admin-table-body', true); 
        uiAlert('Deleted', 'The player has been removed.');
    });
}

// --- SUPER ADMIN FUNCTIONS ---
async function fetchUsersForSuperAdmin() {
    const tbody = document.getElementById('super-admin-table-body');
    if (!tbody || !window.supabaseClient) return; 
    const { data: profiles } = await window.supabaseClient.from('profiles').select('*').order('email');
    tbody.innerHTML = '';
    profiles?.forEach(profile => {
        const btnText = profile.is_admin ? "Revoke Admin" : "Make Admin";
        const btnClass = profile.is_admin ? "action-btn delete" : "action-btn promote";
        const statusBadge = profile.is_admin ? '<span class="badge-admin">Admin</span>' : '<span class="badge-user">User</span>';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color:var(--text-dark); word-break: break-all;">${profile.email}</strong> ${profile.is_super_admin ? ' <span style="font-size:0.8rem;">👑</span>' : ''}</td>
            <td>${statusBadge}</td>
            <td>${!profile.is_super_admin ? `<button onclick="toggleAdmin('${profile.id}', ${profile.is_admin})" class="${btnClass}">${btnText}</button>` : '<span style="color:var(--text-muted); font-size:0.85rem;">Root User</span>'}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function toggleAdmin(id, currentStatus) {
    if (!window.supabaseClient) return;
    await window.supabaseClient.from('profiles').update({ is_admin: !currentStatus }).eq('id', id);
    fetchUsersForSuperAdmin(); 
}
