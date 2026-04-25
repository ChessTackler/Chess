// ==========================================
// CDCA ALL-TIME PLAYERS CONTROLLER
// Depends on: app.js (for supabaseClient & Modal UI)
// ==========================================

window.currentAllTimePlayersList = [];

// --- FETCH & RENDER ---
async function fetchAllTimePlayers(tableBodyId, isAdmin = false) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody || !window.supabaseClient) return;

    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 4 : 5}" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading historical records...</td></tr>`;

    const { data: players, error } = await window.supabaseClient
        .from('all_time_players')
        .select('*')
        .order('state_id', { ascending: true });

    if (error) {
        window.uiAlert('Database Error', error.message, true);
        return;
    }

    window.currentAllTimePlayersList = players;
    tbody.innerHTML = '';

    if (players.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 4 : 5}" style="text-align: center; color: var(--text-muted); padding: 2rem;">No historical players found.</td></tr>`;
        return;
    }

    players.forEach(player => {
        const tr = document.createElement('tr');
        const fullName = `${player.first_name} ${player.last_name || ''}`.trim();
        const displayRating = player.fide_rating || '<span style="color:var(--text-muted); font-weight:400;">Unrated</span>';
        const displayTitle = player.title ? `<span style="background: var(--bg-light); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">${player.title}</span>` : '<span style="color:var(--text-muted);">None</span>';

        if (isAdmin) {
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--text-dark);">${fullName}</td>
                <td>${player.state_id}</td>
                <td style="font-weight: 600;">${displayRating}</td>
                <td>
                    <div style="display:flex; gap:0.5rem;">
                        <button onclick="openEditAllTimeModal('${player.id}')" class="action-btn promote" style="padding: 0.4rem 0.6rem;">Edit</button>
                        <button onclick="deleteAllTimePlayer('${player.id}')" class="action-btn delete" style="padding: 0.4rem 0.6rem;">Delete</button>
                    </div>
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--primary-blue);">${fullName}</td>
                <td>${player.state_id}</td>
                <td>${player.fide_id || '-'}</td>
                <td style="font-weight: 700; color: var(--accent-orange);">${displayRating}</td>
                <td>${displayTitle}</td>
            `;
        }
        tbody.appendChild(tr);
    });
}

// --- SEARCH FILTER ---
function filterAllTimeTable() {
    let input = document.getElementById("searchAllTimeInput").value.toUpperCase();
    let tbody = document.getElementById("all-time-public-body") || document.getElementById("all-time-admin-body");
    if (!tbody) return;
    
    let trs = tbody.getElementsByTagName("tr");
    for (let i = 0; i < trs.length; i++) {
        if (trs[i].getElementsByTagName("td").length === 1) continue; 
        trs[i].style.display = trs[i].innerText.toUpperCase().indexOf(input) > -1 ? "" : "none";
    }
}

// --- ADD PLAYER ---
async function addAllTimePlayer(event) {
    event.preventDefault();
    if (!window.supabaseClient) return window.uiAlert("Offline", "Cannot connect to database.", true);

    const newPlayer = {
        first_name: document.getElementById('at_first_name').value.trim(),
        last_name: document.getElementById('at_last_name').value.trim(),
        state_id: document.getElementById('at_state_id').value.trim(),
        fide_id: document.getElementById('at_fide_id').value.trim() || null,
        fide_rating: document.getElementById('at_fide_rating').value || null,
        title: document.getElementById('at_title').value || null
    };

    const { error } = await window.supabaseClient.from('all_time_players').insert([newPlayer]);
    
    if (error) {
        if (error.code === '23505') {
            window.uiAlert('Duplicate Entry', 'A player with this State ID already exists.', true);
        } else {
            window.uiAlert('System Error', error.message, true);
        }
    } else {
        window.uiAlert('Database Updated', 'Historical player saved successfully!');
        document.getElementById('add-all-time-form').reset();
        fetchAllTimePlayers('all-time-admin-body', true);
    }
}

// --- EDIT MODAL ---
window.openEditAllTimeModal = function(id) {
    const player = window.currentAllTimePlayersList.find(p => p.id === id);
    if(!player) return window.uiAlert('Error', 'Player data not found locally.', true);

    const bodyHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
            <div class="form-group" style="margin:0;"><label>First Name</label><input type="text" id="edit_at_first" value="${player.first_name}" style="background:#fff;"></div>
            <div class="form-group" style="margin:0;"><label>Last Name</label><input type="text" id="edit_at_last" value="${player.last_name || ''}" style="background:#fff;"></div>
            <div class="form-group" style="margin:0;"><label>State ID</label><input type="text" id="edit_at_state" value="${player.state_id}" style="background:#fff;"></div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div class="form-group" style="margin:0;"><label>FIDE ID</label><input type="text" id="edit_at_fide" value="${player.fide_id || ''}" style="background:#fff;"></div>
                <div class="form-group" style="margin:0;"><label>FIDE Rating</label><input type="number" id="edit_at_rating" value="${player.fide_rating || ''}" style="background:#fff;"></div>
            </div>
            <div class="form-group" style="margin:0;">
                <label>Titles (Comma Separated)</label>
                <input type="text" id="edit_at_title" value="${player.title || ''}" placeholder="e.g. IA, FA, FM" style="background:#fff;">
            </div>
        </div>
    `;

    window._tempSaveAllTimeEdit = async () => {
        const updateData = {
            first_name: document.getElementById('edit_at_first').value.trim(),
            last_name: document.getElementById('edit_at_last').value.trim() || null,
            state_id: document.getElementById('edit_at_state').value.trim(),
            fide_id: document.getElementById('edit_at_fide').value.trim() || null,
            fide_rating: document.getElementById('edit_at_rating').value || null,
            title: document.getElementById('edit_at_title').value.trim() || null
        };

        const { error } = await window.supabaseClient.from('all_time_players').update(updateData).eq('id', id);

        if(error) {
            window.uiAlert('Update Failed', error.message, true);
        } else {
            window.closeModal();
            window.uiAlert('Success', 'Historical player record updated.');
            fetchAllTimePlayers('all-time-admin-body', true);
        }
    };

    const footerHTML = `
        <button class="modal-btn modal-btn-cancel" onclick="window.closeModal()">Cancel</button>
        <button class="modal-btn modal-btn-confirm" onclick="window._tempSaveAllTimeEdit()">Save Changes</button>
    `;

    window.showModal('✏️ Edit Historical Record', bodyHTML, footerHTML);
}

// --- DELETE ---
window.deleteAllTimePlayer = async function(id) {
    if (!window.supabaseClient) return;
    window.uiConfirm('⚠️ Delete Record?', 'Are you sure you want to remove this historical player?', 'Delete Record', async () => {
        const { error } = await window.supabaseClient.from('all_time_players').delete().eq('id', id);
        if (error) {
            window.uiAlert('Deletion Failed', error.message, true);
        } else {
            fetchAllTimePlayers('all-time-admin-body', true); 
            window.uiAlert('Deleted', 'Record permanently removed.');
        }
    });
}
