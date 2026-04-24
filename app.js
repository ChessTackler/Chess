const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- AUTH & ROLES ---
async function handleSignUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, error: error.message };
    
    // Automatically create a base profile for the new user
    if (data.user) {
        await supabase.from('profiles').insert([{ id: data.user.id, email: email }]);
    }
    return { success: true };
}

async function handleLogin(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

// Checks if the user is an admin or super admin
async function verifyAdminAccess() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { allowed: false };

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (!profile || !profile.is_admin) {
        return { allowed: false, error: "Access Denied: You do not have the Admin tag." };
    }

    return { allowed: true, is_super_admin: profile.is_super_admin, email: profile.email };
}

// --- DATABASE FUNCTIONS (For Players) ---
async function fetchPlayers(tableBodyId, isAdmin = false) {
    const { data: players } = await supabase.from('players').select('*').order('fide_rating', { ascending: false });
    const tbody = document.getElementById(tableBodyId);
    tbody.innerHTML = ''; 

    players?.forEach(player => {
        const tr = document.createElement('tr');
        if (isAdmin) {
            tr.innerHTML = `
                <td style="font-weight: 500;">${player.first_name} ${player.last_name}</td>
                <td>${player.fide_rating || 'Unrated'}</td>
                <td><button onclick="deletePlayer('${player.id}')" class="btn-danger">Delete</button></td>
            `;
        } else {
            tr.innerHTML = `
                <td style="font-weight: 500; color: var(--primary-blue);">${player.first_name} ${player.last_name}</td>
                <td>${player.state_id}</td>
                <td>${player.fide_id || '-'}</td>
                <td style="font-weight: 600;">${player.fide_rating || 'Unrated'}</td>
                <td>${player.title || ''}</td>
            `;
        }
        tbody.appendChild(tr);
    });
}

async function addPlayer() {
    const newPlayer = {
        first_name: document.getElementById('first_name').value,
        last_name: document.getElementById('last_name').value,
        state_id: document.getElementById('state_id').value,
        fide_id: document.getElementById('fide_id').value || null,
        fide_rating: document.getElementById('fide_rating').value || null,
        title: document.getElementById('title').value
    };
    const { error } = await supabase.from('players').insert([newPlayer]);
    if (error) alert('Error: ' + error.message);
    else { alert('Saved!'); document.getElementById('add-player-form').reset(); fetchPlayers('admin-table-body', true); }
}

async function deletePlayer(id) {
    if(confirm("Delete this player?")) {
        await supabase.from('players').delete().eq('id', id);
        fetchPlayers('admin-table-body', true); 
    }
}

// --- SUPER ADMIN FUNCTIONS (Manage Users) ---
async function fetchUsersForSuperAdmin() {
    const { data: profiles } = await supabase.from('profiles').select('*').order('email');
    const tbody = document.getElementById('super-admin-table-body');
    tbody.innerHTML = '';

    profiles?.forEach(profile => {
        const btnText = profile.is_admin ? "Remove Admin Tag" : "Give Admin Tag";
        const btnColor = profile.is_admin ? "#E74C3C" : "var(--primary-blue)";
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${profile.email} ${profile.is_super_admin ? '<strong>(Super)</strong>' : ''}</td>
            <td style="font-weight:bold; color:${profile.is_admin ? 'green' : 'gray'}">${profile.is_admin ? 'Admin' : 'User'}</td>
            <td>
                ${!profile.is_super_admin ? `<button onclick="toggleAdmin('${profile.id}', ${profile.is_admin})" style="background:${btnColor}; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">${btnText}</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function toggleAdmin(id, currentStatus) {
    await supabase.from('profiles').update({ is_admin: !currentStatus }).eq('id', id);
    fetchUsersForSuperAdmin(); // Refresh list
}
