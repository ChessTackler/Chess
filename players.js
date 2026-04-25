// ==========================================
// CDCA ALL-TIME PLAYERS CONTROLLER
// ==========================================

window.currentAllTimePlayersList = [];

// --- 1. FETCH & RENDER ---
async function fetchAllTimePlayers(tableBodyId, isAdmin = false) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody || !window.supabaseClient) return;

    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 5 : 6}" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading historical records...</td></tr>`;

    const { data: players, error } = await window.supabaseClient
        .from('all_time_players')
        .select('*')
        .order('cdca_id', { ascending: true }); 

    if (error) {
        window.uiAlert('Database Error', error.message, true);
        return;
    }

    window.currentAllTimePlayersList = players;
    tbody.innerHTML = '';

    if (players.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 5 : 6}" style="text-align: center; color: var(--text-muted); padding: 2rem;">No historical players found.</td></tr>`;
        return;
    }

    players.forEach(player => {
        const tr = document.createElement('tr');
        const fullName = `${player.first_name} ${player.last_name || ''}`.trim();
        const displayStateId = player.state_id || '<span style="color:var(--text-muted);">Pending</span>';
        const displayRating = player.fide_rating || '<span style="color:var(--text-muted); font-weight:400;">Unrated</span>';
        const displayTitle = player.title ? `<span style="background: var(--bg-light); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">${player.title}</span>` : '<span style="color:var(--text-muted);">None</span>';

        if (isAdmin) {
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--text-dark);">${fullName}</td>
                <td><strong style="color: var(--primary-blue);">${player.cdca_id}</strong></td>
                <td>${displayStateId}</td>
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
                <td><strong style="color: var(--primary-blue);">${player.cdca_id}</strong></td>
                <td>${displayStateId}</td>
                <td>${player.fide_id || '-'}</td>
                <td style="font-weight: 700; color: var(--accent-orange);">${displayRating}</td>
                <td>${displayTitle}</td>
            `;
        }
        tbody.appendChild(tr);
    });
}

// --- 2. SEARCH FILTER ---
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

// --- 3. ADD PLAYER ---
async function addAllTimePlayer(event) {
    event.preventDefault();
    if (!window.supabaseClient) return window.uiAlert("Offline", "Cannot connect to database.", true);

    const newPlayer = {
        first_name: document.getElementById('at_first_name').value.trim(),
        last_name: document.getElementById('at_last_name').value.trim(),
        cdca_id: document.getElementById('at_cdca_id').value.trim(),
        state_id: document.getElementById('at_state_id').value.trim() || null,
        fide_id: document.getElementById('at_fide_id').value.trim() || null,
        fide_rating: document.getElementById('at_fide_rating').value || null,
        title: document.getElementById('at_title').value || null
    };

    const { error } = await window.supabaseClient.from('all_time_players').insert([newPlayer]);
    
    if (error) {
        if (error.code === '23505') {
            window.uiAlert('Duplicate Entry', 'A player with this CDCA ID already exists.', true);
        } else {
            window.uiAlert('System Error', error.message, true);
        }
    } else {
        window.uiAlert('Database Updated', 'Historical player saved successfully!');
        document.getElementById('add-all-time-form').reset();
        fetchAllTimePlayers('all-time-admin-body', true);
    }
}

// --- 4. EDIT MODAL ---
window.openEditAllTimeModal = function(id) {
    const player = window.currentAllTimePlayersList.find(p => p.id === id);
    if(!player) return window.uiAlert('Error', 'Player data not found locally.', true);

    const bodyHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div class="form-group" style="margin:0;"><label>First Name</label><input type="text" id="edit_at_first" value="${player.first_name}" style="background:#fff;"></div>
                <div class="form-group" style="margin:0;"><label>Last Name</label><input type="text" id="edit_at_last" value="${player.last_name || ''}" style="background:#fff;"></div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div class="form-group" style="margin:0;"><label>CDCA ID</label><input type="text" id="edit_at_cdca" value="${player.cdca_id}" style="background:#fff;" required></div>
                <div class="form-group" style="margin:0;"><label>State ID</label><input type="text" id="edit_at_state" value="${player.state_id || ''}" placeholder="Pending" style="background:#fff;"></div>
            </div>
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
            cdca_id: document.getElementById('edit_at_cdca').value.trim(),
            state_id: document.getElementById('edit_at_state').value.trim() || null,
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

// --- 5. DELETE ---
window.deleteAllTimePlayer = async function(id) {
    if (!window.supabaseClient) return;
    window.uiConfirm('⚠️ Delete Record?', 'Are you sure you want to remove this historical player?', 'Delete Record', async () => {
        const { error } = await window.supabaseClient.from('all_time_players').delete().eq('id', id);
        if (error) window.uiAlert('Deletion Failed', error.message, true);
        else {
            fetchAllTimePlayers('all-time-admin-body', true); 
            window.uiAlert('Deleted', 'Record permanently removed.');
        }
    });
}

// --- 6. MOBILE AUTO-FEED SCRIPT (DIAGNOSTIC MODE) ---
window.mobileFeedDatabase = async function() {
    try {
        if (!window.supabaseClient) {
            alert("🛑 CRASH: Supabase is not connected to this page.");
            return;
        }
        
        alert("⏳ Attempting to contact the database now...");

        const playersToInsert = [
            { cdca_id: "100025", state_id: null, first_name: "Rahul", last_name: "Sangma", title: "IM", fide_rating: null, fide_id: null },
            { cdca_id: "200025", state_id: null, first_name: "Priya", last_name: "Ratnam", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "300025", state_id: null, first_name: "Kumar", last_name: "Kaushlendra", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "400025", state_id: null, first_name: "Sunil", last_name: "Kumar Saini", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "500025", state_id: null, first_name: "Y.P", last_name: "srivastava", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "600025", state_id: null, first_name: "Nand", last_name: "Kishore", title: "FA", fide_rating: null, fide_id: null },
            { cdca_id: "700025", state_id: null, first_name: "Haque", last_name: "Minhajul", title: "FI, AIM", fide_rating: null, fide_id: null },
            { cdca_id: "800025", state_id: null, first_name: "Vikash", last_name: "Kumar Dwivedi", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "900025", state_id: null, first_name: "Rahul", last_name: "Raj", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "1000025", state_id: null, first_name: "Ved", last_name: "Prakash", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "1100025", state_id: null, first_name: "Mohit", last_name: "Kumar Soni", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "1200025", state_id: null, first_name: "Md.", last_name: "Attaula Khan", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "1300025", state_id: null, first_name: "Sonu", last_name: "Kumar", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "1400025", state_id: null, first_name: "Amandeep", last_name: "Chauhan", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "1500025", state_id: null, first_name: "Kumar", last_name: "Amrendra", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "1600025", state_id: null, first_name: "Praveen", last_name: "Kumar Soni", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "1700025", state_id: null, first_name: "Raj", last_name: "Prakhar", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "1800025", state_id: null, first_name: "Dhananjay", last_name: "Kumar", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "1900025", state_id: null, first_name: "Arbind", last_name: "Kumar Singh", title: "IA, FA, NI", fide_rating: null, fide_id: null },
            { cdca_id: "2000025", state_id: null, first_name: "Nitesh", last_name: "Kumar", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "2100025", state_id: null, first_name: "Randhir", last_name: "Kumar Singh", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "2200025", state_id: null, first_name: "Sagar", last_name: "Kumar", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "2300025", state_id: null, first_name: "Prem", last_name: "Kumar", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "2400025", state_id: null, first_name: "Ravi", last_name: "Kumar", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "2500025", state_id: null, first_name: "Kumar", last_name: "Shubham", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "2600025", state_id: null, first_name: "Raj", last_name: "Shekhar", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "2700025", state_id: null, first_name: "Sumedha", last_name: "Shree", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "2800025", state_id: null, first_name: "Mohini", last_name: "Pandit", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "2900025", state_id: null, first_name: "Nitesh", last_name: "Ranjan", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "3000025", state_id: null, first_name: "Farhan", last_name: "Raza", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "3100025", state_id: null, first_name: "Shivam", last_name: "Anand", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "3200025", state_id: null, first_name: "Ashwini", last_name: "Giri", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "3300025", state_id: null, first_name: "Akash", last_name: "kumar", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "3400025", state_id: null, first_name: "Shubhankar", last_name: "Kumar", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "3500025", state_id: null, first_name: "Ayush", last_name: "Kumar", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "3600025", state_id: null, first_name: "Sunny", last_name: "Kumar Singh", title: null, fide_rating: null, fide_id: null },
            { cdca_id: "3700025", state_id: null, first_name: "Aryan", last_name: "Singh", title: null, fide_rating: null, fide_id: null }
        ];

        const { data, error } = await window.supabaseClient.from('all_time_players').insert(playersToInsert);
        
        if (error) {
            alert("❌ DATABASE ERROR:\n\nMessage: " + error.message + "\n\nCode: " + error.code);
        } else {
            alert("✅ SUCCESS! Data uploaded.");
            fetchAllTimePlayers('all-time-admin-body', true);
        }
    } catch (err) {
        alert("⚠️ JAVASCRIPT CRASH:\n\n" + err.message);
    }
}
