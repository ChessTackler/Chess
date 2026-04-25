// ==========================================
// ALL-TIME PLAYERS ENGINE (WITH PAGINATION)
// ==========================================

window.currentAllTimePlayersList = [];
window.atPage = 1;
window.atPageSize = 10;
window.atSearchQuery = "";
window.atTbodyId = "";
window.atIsAdmin = false;

// 1. Fetch from Database
window.fetchAllTimePlayers = async function(tableBodyId, isAdmin = false) {
    window.atTbodyId = tableBodyId;
    window.atIsAdmin = isAdmin;
    if (!window.supabaseClient) return;

    const { data: players, error } = await window.supabaseClient.from('all_time_players').select('*').order('cdca_id', { ascending: true }); 
    if (error) return window.uiAlert('Database Error', error.message, true);

    window.currentAllTimePlayersList = players;
    window.renderAllTimeTable();
}

// 2. Render HTML & Pagination
window.renderAllTimeTable = function() {
    const tbody = document.getElementById(window.atTbodyId);
    if (!tbody) return;

    // Filter by global search query
    let filtered = window.currentAllTimePlayersList.filter(p => {
        const searchStr = `${p.first_name} ${p.last_name || ''} ${p.cdca_id} ${p.state_id || ''} ${p.fide_id || ''} ${p.title || ''}`.toLowerCase();
        return searchStr.includes(window.atSearchQuery);
    });

    // Pagination Math
    const totalPages = Math.ceil(filtered.length / window.atPageSize) || 1;
    if (window.atPage > totalPages) window.atPage = totalPages;
    const start = (window.atPage - 1) * window.atPageSize;
    const paginated = filtered.slice(start, start + window.atPageSize);

    tbody.innerHTML = '';
    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${window.atIsAdmin ? 5 : 6}" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching historical players found.</td></tr>`;
    } else {
        paginated.forEach(player => {
            const tr = document.createElement('tr');
            const fullName = `${player.first_name} ${player.last_name || ''}`.trim();
            const displayStateId = player.state_id ? `<span class="data-id">${player.state_id}</span>` : '<span class="data-unrated">Pending</span>';
            const displayCdcaId = `<span class="data-id" style="color: var(--primary-blue); font-weight: 600;">${player.cdca_id}</span>`;
            const displayFideId = player.fide_id ? `<span class="data-id">${player.fide_id}</span>` : '-';
            const displayRating = player.fide_rating ? `<span class="data-rating">${player.fide_rating}</span>` : '<span class="data-unrated">Unrated</span>';
            const displayTitle = window.formatTitlesToBadges(player.title);

            if (window.atIsAdmin) {
                tr.innerHTML = `<td><div class="player-name">👤 ${fullName}</div></td><td>${displayCdcaId}</td><td>${displayStateId}</td><td>${displayRating}</td><td><div style="display:flex; gap:0.5rem;"><button onclick="openEditAllTimeModal('${player.id}')" class="action-btn promote">Edit</button><button onclick="deleteAllTimePlayer('${player.id}')" class="action-btn delete">Delete</button></div></td>`;
            } else {
                tr.innerHTML = `<td><div class="player-name">${fullName}</div></td><td>${displayCdcaId}</td><td>${displayStateId}</td><td>${displayFideId}</td><td>${displayRating}</td><td>${displayTitle}</td>`;
            }
            tbody.appendChild(tr);
        });
    }

    // Update Pagination UI
    const pageInfo = document.getElementById('at-page-info');
    const btnPrev = document.getElementById('at-prev');
    const btnNext = document.getElementById('at-next');
    
    if(pageInfo) pageInfo.innerText = `Page ${window.atPage} of ${totalPages}`;
    if(btnPrev) btnPrev.disabled = (window.atPage === 1);
    if(btnNext) btnNext.disabled = (window.atPage === totalPages);
}

// 3. Change Page Action
window.changeAtPage = function(direction) {
    window.atPage += direction;
    window.renderAllTimeTable();
}

// --- CRUD LOGIC ---
window.addAllTimePlayer = async function(event) {
    event.preventDefault();
    if (!window.supabaseClient) return;
    const newPlayer = { first_name: document.getElementById('at_first_name').value.trim(), last_name: document.getElementById('at_last_name').value.trim(), cdca_id: document.getElementById('at_cdca_id').value.trim(), state_id: document.getElementById('at_state_id').value.trim() || null, fide_id: document.getElementById('at_fide_id').value.trim() || null, fide_rating: document.getElementById('at_fide_rating').value || null, title: document.getElementById('at_title').value || null };
    const { error } = await window.supabaseClient.from('all_time_players').insert([newPlayer]);
    if (error) window.uiAlert('Error', error.message, true);
    else { window.uiAlert('Success', 'Player saved!'); document.getElementById('add-all-time-form').reset(); window.fetchAllTimePlayers(window.atTbodyId, window.atIsAdmin); }
}

window.openEditAllTimeModal = function(id) {
    const player = window.currentAllTimePlayersList.find(p => p.id === id);
    if(!player) return;
    const bodyHTML = `<div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;"><div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;"><div class="form-group" style="margin:0;"><label>First Name</label><input type="text" id="edit_at_first" value="${player.first_name}"></div><div class="form-group" style="margin:0;"><label>Last Name</label><input type="text" id="edit_at_last" value="${player.last_name || ''}"></div></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;"><div class="form-group" style="margin:0;"><label>CDCA ID</label><input type="text" id="edit_at_cdca" value="${player.cdca_id}" required></div><div class="form-group" style="margin:0;"><label>State ID</label><input type="text" id="edit_at_state" value="${player.state_id || ''}"></div></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;"><div class="form-group" style="margin:0;"><label>FIDE ID</label><input type="text" id="edit_at_fide" value="${player.fide_id || ''}"></div><div class="form-group" style="margin:0;"><label>FIDE Rating</label><input type="number" id="edit_at_rating" value="${player.fide_rating || ''}"></div></div><div class="form-group" style="margin:0;"><label>Titles (Text)</label><input type="text" id="edit_at_title" value="${player.title || ''}"></div></div>`;
    window._tempSaveAllTimeEdit = async () => {
        const updateData = { first_name: document.getElementById('edit_at_first').value.trim(), last_name: document.getElementById('edit_at_last').value.trim() || null, cdca_id: document.getElementById('edit_at_cdca').value.trim(), state_id: document.getElementById('edit_at_state').value.trim() || null, fide_id: document.getElementById('edit_at_fide').value.trim() || null, fide_rating: document.getElementById('edit_at_rating').value || null, title: document.getElementById('edit_at_title').value.trim() || null };
        const { error } = await window.supabaseClient.from('all_time_players').update(updateData).eq('id', id);
        if(error) window.uiAlert('Failed', error.message, true);
        else { window.closeModal(); window.uiAlert('Success', 'Record updated.'); window.fetchAllTimePlayers(window.atTbodyId, window.atIsAdmin); }
    };
    window.showModal('✏️ Edit Record', bodyHTML, `<button class="modal-btn modal-btn-cancel" onclick="window.closeModal()">Cancel</button><button class="modal-btn modal-btn-confirm" onclick="window._tempSaveAllTimeEdit()">Save</button>`);
}

window.deleteAllTimePlayer = async function(id) {
    if (!window.supabaseClient) return;
    window.uiConfirm('⚠️ Delete?', 'Remove this record?', 'Delete', async () => {
        await window.supabaseClient.from('all_time_players').delete().eq('id', id);
        window.fetchAllTimePlayers(window.atTbodyId, window.atIsAdmin); 
        window.uiAlert('Deleted', 'Record removed.');
    });
}
