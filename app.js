// ==========================================
// SUPABASE INITIALIZATION
// ==========================================
const supabaseUrl = 'https://vwzcdfgbqaszhqlvewch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3emNkZmdicWFzemhxbHZld2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDc4MTgsImV4cCI6MjA5MjYyMzgxOH0.SBEcDqvAkpvxyVV2eSxuvYt-0Ehst5B0_dxI9u0eTRQ';

if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
}

// ==========================================
// GLOBAL UI & SECURITY HELPERS
// ==========================================
window.escapeHTML = function(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

window.formatTitlesToBadges = function(titleString) {
    if (!titleString || titleString.trim() === '') return '<span class="badge badge-default" style="background:transparent;box-shadow:none;">None</span>';
    const titles = window.escapeHTML(titleString).split(',').map(t => t.trim());
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

window.formatStatusBadge = function(statusString) {
    if (statusString === 'Active') return `<span class="badge status-active">Active</span>`;
    return `<span class="badge status-inactive">Inactive</span>`;
};

function initModalSystem() {
    if(document.getElementById('custom-modal-overlay')) return;
    const modalHTML = `<div id="custom-modal-overlay" class="custom-modal-overlay"><div id="custom-modal" class="custom-modal"><div id="custom-modal-header" class="custom-modal-header"><h3 id="custom-modal-title">Notice</h3><button class="close-modal-btn" id="close-modal-top-btn">×</button></div><div id="custom-modal-body" class="custom-modal-body"></div><div id="custom-modal-footer" class="custom-modal-footer"></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('close-modal-top-btn').addEventListener('click', window.closeModal);
}

window.showModal = function(title, bodyHTML, footerHTML) { 
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
    const body = `<div style="display:flex; align-items:center; gap:12px;"><span style="font-size:1.8rem; line-height:1;">${icon}</span><span style="color:${color}; font-weight:600; font-size:1rem;">${message}</span></div>`; 
    const footer = `<button class="modal-btn modal-btn-confirm" id="modal-alert-btn">Got it</button>`; 
    window.showModal(title, body, footer); 
    document.getElementById('modal-alert-btn').addEventListener('click', window.closeModal);
}

window.uiConfirm = function(title, message, confirmBtnText, onConfirm) { 
    const body = `<p style="font-size:1rem; color:#334155;">${message}</p>`; 
    const footer = `<button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">Cancel</button><button class="modal-btn modal-btn-danger" id="modal-confirm-btn">${confirmBtnText}</button>`; 
    window.showModal(title, body, footer); 
    document.getElementById('modal-cancel-btn').addEventListener('click', window.closeModal);
    document.getElementById('modal-confirm-btn').addEventListener('click', () => {
        window.closeModal();
        if(onConfirm) onConfirm();
    });
}

// ==========================================
// AUTH & NAVBAR (Linked to Admin Portal)
// ==========================================
async function updateNavbar() {
    const nav = document.getElementById('main-nav');
    const sidebarAuth = document.getElementById('sidebar-auth');

    if (!window.supabaseClient) { 
        if(nav) nav.innerHTML = `<div style="display:flex; align-items:center; gap:1rem;"><a href="login.html" class="nav-auth-btn">Log In</a><a href="signup.html" class="btn-orange" style="padding:0.6rem 1.2rem;">Sign Up</a></div>`; 
        if(sidebarAuth) sidebarAuth.innerHTML = `<div class="sidebar-auth-group"><a href="login.html" class="sidebar-btn sidebar-btn-outline">Log In</a><a href="signup.html" class="sidebar-btn sidebar-btn-solid">Sign Up</a></div>`;
        return; 
    }

    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            const { data: profile } = await window.supabaseClient.from('profiles').select('is_admin').eq('id', session.user.id).single();
            
            let adminLinkDesktop = profile && profile.is_admin ? `<a href="adminportal.html" style="color: var(--accent-orange); font-weight:700;">Admin Portal</a>` : "";
            let adminLinkSidebar = profile && profile.is_admin ? `<a href="adminportal.html" class="sidebar-btn sidebar-btn-admin">Admin Portal</a>` : "";

            if(nav) nav.innerHTML = `${adminLinkDesktop} <a href="#" onclick="handleLogout()" class="nav-auth-btn" style="color: #E74C3C; border-left: 1px solid var(--border-color); padding-left: 1.5rem; margin-left: 0.5rem;">Logout</a>`;
            if(sidebarAuth) sidebarAuth.innerHTML = `<div class="sidebar-auth-group">${adminLinkSidebar}<a href="#" onclick="handleLogout()" class="sidebar-btn sidebar-btn-danger">Logout</a></div>`;
        } else { 
            if(nav) nav.innerHTML = `<div style="display:flex; align-items:center; gap:1rem; border-left:1px solid var(--border-color); padding-left:1rem; margin-left:0.5rem;"><a href="login.html" class="nav-auth-btn">Log In</a><a href="signup.html" class="btn-orange" style="padding:0.6rem 1.2rem;">Sign Up</a></div>`; 
            if(sidebarAuth) sidebarAuth.innerHTML = `<div class="sidebar-auth-group"><a href="login.html" class="sidebar-btn sidebar-btn-outline">Log In</a><a href="signup.html" class="sidebar-btn sidebar-btn-solid">Sign Up</a></div>`;
        }
    } catch (error) { 
        if(nav) nav.innerHTML = `<a href="login.html" class="nav-auth-btn">Log In</a>`; 
        if(sidebarAuth) sidebarAuth.innerHTML = `<a href="login.html" class="sidebar-btn sidebar-btn-outline">Log In</a>`;
    }
}

window.handleLogout = async function() { 
    if (!window.supabaseClient) return; 
    await window.supabaseClient.auth.signOut(); 
    window.location.href = 'index.html'; 
}

window.verifyAdminAccess = async function() { 
    if (!window.supabaseClient) return { allowed: false, error: "Offline." }; 
    const { data: { session } } = await window.supabaseClient.auth.getSession(); 
    if (!session) return { allowed: false }; 
    const { data: profile, error } = await window.supabaseClient.from('profiles').select('*').eq('id', session.user.id).single(); 
    if (error || !profile || !profile.is_admin) return { allowed: false, error: "Access Denied." }; 
    return { allowed: true, is_super_admin: profile.is_super_admin, email: profile.email }; 
}

// ==========================================
// PLAYER DATABASE ENGINE
// ==========================================
window.currentPlayersList = [];
window.activePage = 1;
window.activePageSize = 10;
window.activeSearchQuery = "";
window.activeTbodyId = "";
window.activeIsAdmin = false;

window.fetchPlayers = async function(tableBodyId, isAdmin = false) {
    window.activeTbodyId = tableBodyId;
    window.activeIsAdmin = isAdmin;
    if (!window.supabaseClient) return;

    const { data: players, error } = await window.supabaseClient.from('player_database').select('*').order('first_name', { ascending: true });
    if (error) return window.uiAlert('Database Error', error.message, true);

    window.currentPlayersList = players || [];
    window.renderTable();
}

window.renderTable = function() {
    const tbody = document.getElementById(window.activeTbodyId);
    if (!tbody) return;

    let filtered = window.currentPlayersList.filter(p => {
        const searchStr = `${p.first_name} ${p.last_name || ''} ${p.cdca_id} ${p.state_id || ''} ${p.fide_id || ''} ${p.title || ''} ${p.id_status || ''}`.toLowerCase();
        return searchStr.includes(window.activeSearchQuery);
    });

    const totalPages = Math.ceil(filtered.length / window.activePageSize) || 1;
    if (window.activePage > totalPages) window.activePage = totalPages;
    const start = (window.activePage - 1) * window.activePageSize;
    const paginated = filtered.slice(start, start + window.activePageSize);

    tbody.innerHTML = ''; 
    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${window.activeIsAdmin ? 6 : 7}" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching players found in database.</td></tr>`;
    } else {
        paginated.forEach(player => {
            const tr = document.createElement('tr');
            const fullName = window.escapeHTML(`${player.first_name} ${player.last_name || ''}`.trim());
            const displayCdcaId = `<span class="data-id" style="color: var(--primary-blue); font-weight: 600;">${window.escapeHTML(player.cdca_id)}</span>`;
            const displayStateId = player.state_id ? `<span class="data-id">${window.escapeHTML(player.state_id)}</span>` : '<span class="data-unrated">Pending</span>';
            const displayFideId = player.fide_id ? `<span class="data-id">${window.escapeHTML(player.fide_id)}</span>` : '-';
            const displayRating = player.fide_rating ? `<span class="data-rating">${player.fide_rating}</span>` : '<span class="data-unrated">Unrated</span>';
            const displayTitle = window.formatTitlesToBadges(player.title);
            const displayStatus = window.formatStatusBadge(player.id_status);

            if (window.activeIsAdmin) {
                tr.innerHTML = `<td><div class="player-name">👤 ${fullName}</div></td><td>${displayCdcaId}</td><td>${displayStateId}</td><td>${displayRating}</td><td>${displayStatus}</td><td style="text-align: right;"><div style="display:flex; gap:0.5rem; justify-content: flex-end;"><button onclick="openEditModal('${player.id}')" class="action-btn promote">Edit</button><button onclick="deletePlayer('${player.id}')" class="action-btn delete">Delete</button></div></td>`;
            } else {
                tr.innerHTML = `<td><div class="player-name">${fullName}</div></td><td>${displayCdcaId}</td><td>${displayStateId}</td><td>${displayFideId}</td><td>${displayRating}</td><td>${displayTitle}</td><td>${displayStatus}</td>`;
            }
            tbody.appendChild(tr);
        });
    }

    const pageInfo = document.getElementById('page-info');
    const btnPrev = document.getElementById('page-prev');
    const btnNext = document.getElementById('page-next');

    if(pageInfo) pageInfo.innerText = `Page ${window.activePage} of ${totalPages}`;
    if(btnPrev) btnPrev.disabled = (window.activePage === 1);
    if(btnNext) btnNext.disabled = (window.activePage === totalPages);
}

window.changePage = function(direction) {
    window.activePage += direction;
    window.renderTable();
}

window.handleGlobalSearch = function() {
    const input = document.getElementById("searchInput");
    if(!input) return;
    window.activeSearchQuery = input.value.toLowerCase().trim();
    window.activePage = 1; 
    window.renderTable();
}

window.addPlayer = async function(event) {
    event.preventDefault(); 
    if (!window.supabaseClient) return;

    const newPlayer = { 
        first_name: document.getElementById('first_name').value.trim(), 
        last_name: document.getElementById('last_name').value.trim() || null, 
        cdca_id: document.getElementById('cdca_id').value.trim(),
        state_id: document.getElementById('state_id').value.trim() || null, 
        fide_id: document.getElementById('fide_id').value.trim() || null, 
        fide_rating: document.getElementById('fide_rating').value || null, 
        title: document.getElementById('title').value.trim() || null,
        id_status: document.getElementById('id_status').value
    };

    const { error } = await window.supabaseClient.from('player_database').insert([newPlayer]);
    if (error) {
        if (error.code === '23505') window.uiAlert('Duplicate Entry', 'A player with this CDCA ID already exists.', true);
        else window.uiAlert('System Error', error.message, true);
    } else { 
        window.uiAlert('Success', 'Player saved to Master Database!'); 
        document.getElementById('add-player-form').reset(); 
        window.fetchPlayers(window.activeTbodyId, window.activeIsAdmin); 
    }
}

window.openEditModal = function(id) {
    const player = window.currentPlayersList.find(p => p.id === id);
    if(!player) return;

    const bodyHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
            <div class="responsive-grid-2">
                <div class="form-group" style="margin:0;"><label>First Name</label><input type="text" id="edit_first" value="${window.escapeHTML(player.first_name)}"></div>
                <div class="form-group" style="margin:0;"><label>Last Name</label><input type="text" id="edit_last" value="${window.escapeHTML(player.last_name || '')}"></div>
            </div>
            <div class="responsive-grid-2">
                <div class="form-group" style="margin:0;"><label>CDCA ID</label><input type="text" id="edit_cdca" value="${window.escapeHTML(player.cdca_id)}" required></div>
                <div class="form-group" style="margin:0;"><label>State ID</label><input type="text" id="edit_state" value="${window.escapeHTML(player.state_id || '')}"></div>
            </div>
            <div class="responsive-grid-2">
                <div class="form-group" style="margin:0;"><label>FIDE ID</label><input type="text" id="edit_fide" value="${window.escapeHTML(player.fide_id || '')}"></div>
                <div class="form-group" style="margin:0;"><label>FIDE Rating</label><input type="number" id="edit_rating" value="${player.fide_rating || ''}"></div>
            </div>
            <div class="form-group" style="margin:0;"><label>Titles (Comma Separated)</label><input type="text" id="edit_title" value="${window.escapeHTML(player.title || '')}"></div>
            <div class="form-group" style="margin:0;">
                <label>ID Status</label>
                <select id="edit_status" style="width: 100%; padding: 0.9rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <option value="Active" ${player.id_status === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="Inactive" ${player.id_status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
        </div>
    `;

    const footerHTML = `<button class="modal-btn modal-btn-cancel" id="modal-edit-cancel">Cancel</button><button class="modal-btn modal-btn-confirm" id="modal-edit-save">Save</button>`;
    
    window.showModal('✏️ Edit Player', bodyHTML, footerHTML);

    document.getElementById('modal-edit-cancel').addEventListener('click', window.closeModal);
    document.getElementById('modal-edit-save').addEventListener('click', async () => {
        const updateData = { 
            first_name: document.getElementById('edit_first').value.trim(), 
            last_name: document.getElementById('edit_last').value.trim() || null, 
            cdca_id: document.getElementById('edit_cdca').value.trim(),
            state_id: document.getElementById('edit_state').value.trim() || null, 
            fide_id: document.getElementById('edit_fide').value.trim() || null, 
            fide_rating: document.getElementById('edit_rating').value || null, 
            title: document.getElementById('edit_title').value.trim() || null,
            id_status: document.getElementById('edit_status').value
        };
        const { error } = await window.supabaseClient.from('player_database').update(updateData).eq('id', id);
        if(error) window.uiAlert('Failed', error.message, true);
        else { window.closeModal(); window.uiAlert('Success', 'Record updated.'); window.fetchPlayers(window.activeTbodyId, window.activeIsAdmin); }
    });
}

window.deletePlayer = async function(id) {
    if (!window.supabaseClient) return;
    window.uiConfirm('⚠️ Delete?', 'Remove this player entirely?', 'Delete', async () => {
        await window.supabaseClient.from('player_database').delete().eq('id', id);
        window.fetchPlayers(window.activeTbodyId, window.activeIsAdmin); 
        window.uiAlert('Deleted', 'Player removed.');
    });
}

// ==========================================
// NEWS ENGINE
// ==========================================
window.currentNewsList = []; 

window.timeSince = function(dateString) {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
}

window.fetchPublicNews = async function() {
    if (!window.supabaseClient) return;
    const { data: news, error } = await window.supabaseClient.from('news_articles').select('*').order('created_at', { ascending: false });
    if (error) return;

    const headlinesContainer = document.getElementById('public-headlines');
    const announcementsContainer = document.getElementById('public-announcements');

    if(headlinesContainer) headlinesContainer.innerHTML = '';
    if(announcementsContainer) announcementsContainer.innerHTML = '';

    if (!news || news.length === 0) {
        if(headlinesContainer) headlinesContainer.innerHTML = '<p style="color: var(--text-muted);">No news available.</p>';
        return;
    }

    news.forEach(item => {
        const timeAgo = window.timeSince(item.created_at);
        const tagsArray = item.tags ? window.escapeHTML(item.tags).split(',') : [];
        const tagsHtml = tagsArray.map(tag => `<span class="tag-red">${tag.trim()}</span>`).join('');
        const listTagsHtml = tagsArray.map(tag => tag.trim()).join(' · ');
        const safeTitle = window.escapeHTML(item.title);
        const safeAuthor = window.escapeHTML(item.author);

        if (item.category === 'Headline') {
            const html = `
                <a href="headlines.html?id=${item.id}" class="news-card-hero" style="background-image: url('${item.image_url || 'https://via.placeholder.com/600x400?text=No+Image'}');">
                    <div class="news-content">
                        <div class="news-tags">${tagsHtml}</div>
                        <h3 class="news-title">${safeTitle}</h3>
                        <div class="news-meta">
                            <strong>${safeAuthor}</strong>
                            <span>${timeAgo}</span>
                        </div>
                    </div>
                </a>
            `;
            if(headlinesContainer) headlinesContainer.insertAdjacentHTML('beforeend', html);
        } else {
            const html = `
                <a href="announcements.html?id=${item.id}" class="news-list-item">
                    <div class="news-list-tags">${listTagsHtml}</div>
                    <h3 class="news-list-title">${safeTitle}</h3>
                </a>
            `;
            if(announcementsContainer) announcementsContainer.insertAdjacentHTML('beforeend', html);
        }
    });
}

window.fetchAdminNews = async function() {
    const tbody = document.getElementById('admin-news-tbody');
    if (!tbody || !window.supabaseClient) return;

    const { data: news, error } = await window.supabaseClient.from('news_articles').select('*').order('created_at', { ascending: false });
    if (error) return window.uiAlert('Database Error', error.message, true);

    window.currentNewsList = news || [];
    tbody.innerHTML = '';

    if (!window.currentNewsList || window.currentNewsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">No articles published yet.</td></tr>';
        return;
    }

    window.currentNewsList.forEach(item => {
        const tr = document.createElement('tr');
        const badge = item.category === 'Headline' ? '<span class="badge badge-im">Headline</span>' : '<span class="badge badge-default">Announcement</span>';
        const dateObj = new Date(item.created_at);
        const formattedDate = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        const formattedTime = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

        tr.innerHTML = `
            <td>
                <strong style="color:var(--text-dark); display:block; font-size:1.05rem; margin-bottom:5px;">${window.escapeHTML(item.title)}</strong>
                <div style="display:flex; gap:10px; align-items:center; flex-wrap: wrap;">${badge} <span style="font-size:0.8rem; color:#64748b;">Tags: ${window.escapeHTML(item.tags)}</span></div>
            </td>
            <td style="color:#475569; font-size:0.9rem;">
                <strong>${formattedDate}</strong><br>${formattedTime}
            </td>
            <td style="text-align: right;">
                <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                    <button onclick="window.openEditNewsModal('${item.id}')" class="action-btn promote">Edit</button>
                    <button onclick="window.deleteNews('${item.id}')" class="action-btn delete">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.addNews = async function(event) {
    event.preventDefault();
    if (!window.supabaseClient) return;

    let dateVal = document.getElementById('news_date').value;
    let timeVal = document.getElementById('news_time').value;
    let finalDate = new Date(); 
    
    if (dateVal) {
        if (!timeVal) timeVal = new Date().toTimeString().substring(0,5); 
        finalDate = new Date(`${dateVal}T${timeVal}:00`);
    }

    const newArticle = {
        title: document.getElementById('news_title').value.trim(),
        category: document.getElementById('news_category').value,
        tags: document.getElementById('news_tags').value.trim(),
        image_url: document.getElementById('news_image').value.trim() || null,
        author: 'CDCA Admin',
        created_at: finalDate.toISOString()
    };

    if(newArticle.category === 'Headline' && !newArticle.image_url) {
        return window.uiAlert('Missing Image', 'Headlines require a valid Image URL.', true);
    }

    const { error } = await window.supabaseClient.from('news_articles').insert([newArticle]);
    if (error) {
        window.uiAlert('Error', error.message, true);
    } else {
        window.uiAlert('Success', 'Article published!');
        document.getElementById('add-news-form').reset();
        window.fetchAdminNews();
    }
}

window.openEditNewsModal = function(id) {
    const article = window.currentNewsList.find(a => a.id === id);
    if(!article) return;

    const dateObj = new Date(article.created_at);
    const dateStr = dateObj.toISOString().split('T')[0];
    const timeStr = dateObj.toTimeString().substring(0,5);

    const bodyHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
            <div class="form-group" style="margin:0;"><label>Article Title</label><input type="text" id="edit_news_title" value="${window.escapeHTML(article.title)}" required></div>
            <div class="responsive-grid-2">
                <div class="form-group" style="margin:0;">
                    <label>Category</label>
                    <select id="edit_news_category">
                        <option value="Headline" ${article.category === 'Headline' ? 'selected' : ''}>Headline</option>
                        <option value="Announcement" ${article.category === 'Announcement' ? 'selected' : ''}>Announcement</option>
                    </select>
                </div>
                <div class="form-group" style="margin:0;"><label>Tags</label><input type="text" id="edit_news_tags" value="${window.escapeHTML(article.tags || '')}"></div>
            </div>
            <div class="responsive-grid-2">
                <div class="form-group" style="margin:0;"><label>Date</label><input type="date" id="edit_news_date" value="${dateStr}"></div>
                <div class="form-group" style="margin:0;"><label>Time</label><input type="time" id="edit_news_time" value="${timeStr}"></div>
            </div>
            <div class="form-group" style="margin:0;"><label>Image URL</label><input type="url" id="edit_news_image" value="${window.escapeHTML(article.image_url || '')}"></div>
        </div>
    `;

    const footerHTML = `<button class="modal-btn modal-btn-cancel" id="modal-editnews-cancel">Cancel</button><button class="modal-btn modal-btn-confirm" id="modal-editnews-save">Save Changes</button>`;
    
    window.showModal('✏️ Edit Article', bodyHTML, footerHTML);

    document.getElementById('modal-editnews-cancel').addEventListener('click', window.closeModal);
    document.getElementById('modal-editnews-save').addEventListener('click', async () => {
        let eDate = document.getElementById('edit_news_date').value;
        let eTime = document.getElementById('edit_news_time').value;
        let eFinalDate = new Date(`${eDate}T${eTime}:00`);

        const updateData = { 
            title: document.getElementById('edit_news_title').value.trim(), 
            category: document.getElementById('edit_news_category').value, 
            tags: document.getElementById('edit_news_tags').value.trim(),
            image_url: document.getElementById('edit_news_image').value.trim() || null,
            created_at: eFinalDate.toISOString()
        };

        if(updateData.category === 'Headline' && !updateData.image_url) {
            return window.uiAlert('Missing Image', 'Headlines require a valid Image URL.', true);
        }

        const { error } = await window.supabaseClient.from('news_articles').update(updateData).eq('id', id);
        if(error) window.uiAlert('Failed', error.message, true);
        else { window.closeModal(); window.uiAlert('Success', 'Article updated successfully.'); window.fetchAdminNews(); }
    });
}

window.deleteNews = async function(id) {
    if (!window.supabaseClient) return;
    window.uiConfirm('⚠️ Delete Article?', 'Are you sure you want to delete this news item? This cannot be undone.', 'Delete', async () => {
        const { error } = await window.supabaseClient.from('news_articles').delete().eq('id', id);
        if (error) window.uiAlert('Error', error.message, true);
        else { window.uiAlert('Deleted', 'Article removed.'); window.fetchAdminNews(); }
    });
}

window.switchAdminTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    const activeBtn = document.querySelector(`[onclick="window.switchAdminTab('${tabId}')"]`);
    if(activeBtn) activeBtn.classList.add('active');
}

// ==========================================
// SUPER ADMIN LOGIC
// ==========================================
window.fetchUsersForSuperAdmin = async function() {
    const tbody = document.getElementById('super-admin-table-body');
    if (!tbody || !window.supabaseClient) return; 
    const { data: profiles } = await window.supabaseClient.from('profiles').select('*').order('email');
    tbody.innerHTML = '';
    profiles?.forEach(profile => {
        const btnText = profile.is_admin ? "Revoke Admin" : "Make Admin";
        const btnClass = profile.is_admin ? "action-btn delete" : "action-btn promote";
        const statusBadge = profile.is_admin ? '<span class="badge" style="background:#e0f2fe; color:#0369a1;">Admin</span>' : '<span class="badge badge-default">User</span>';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong style="color:var(--text-dark);">${window.escapeHTML(profile.email)}</strong> ${profile.is_super_admin ? '👑' : ''}</td><td>${statusBadge}</td><td style="text-align: right;">${!profile.is_super_admin ? `<button onclick="toggleAdmin('${profile.id}', ${profile.is_admin})" class="${btnClass}">${btnText}</button>` : '<span style="color:var(--text-muted); font-size:0.85rem;">Root User</span>'}</td>`;
        tbody.appendChild(tr);
    });
}

window.toggleAdmin = async function(id, currentStatus) {
    if (!window.supabaseClient) return;
    await window.supabaseClient.from('profiles').update({ is_admin: !currentStatus }).eq('id', id);
    window.fetchUsersForSuperAdmin(); 
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    if (document.getElementById('public-tbody')) window.fetchPlayers('public-tbody', false);
    if (document.getElementById('public-headlines')) window.fetchPublicNews();
});
