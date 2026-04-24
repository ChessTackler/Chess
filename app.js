// Initialize Supabase with your provided keys
const supabaseUrl = 'https://vwzcdfgbqaszhqlvewch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3emNkZmdicWFzemhxbHZld2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDc4MTgsImV4cCI6MjA5MjYyMzgxOH0.SBEcDqvAkpvxyVV2eSxuvYt-0Ehst5B0_dxI9u0eTRQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- 1. AUTHENTICATION LOGIC ---

async function handleSignUp(email, password) {
    try {
        // Step 1: Create user in Auth
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // Step 2: Auto-create basic profile (defaults to normal user)
        if (data.user) {
            const { error: profileError } = await supabase.from('profiles').insert([
                { id: data.user.id, email: email, is_admin: false, is_super_admin: false }
            ]);
            if (profileError) console.error("Profile creation delay:", profileError);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function handleLogin(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

// --- 2. ROLE VERIFICATION ---

async function verifyAdminAccess() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { allowed: false };

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !profile || !profile.is_admin) {
        return { allowed: false, error: "Access Denied: You do not have Admin privileges." };
    }

    return { allowed: true, is_super_admin: profile.is_super_admin, email: profile.email };
}

// --- 3. DATABASE OPERATIONS (Players) ---

async function fetchPlayers(tableBodyId, isAdmin = false) {
    const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .order('fide_rating', { ascending: false });
        
    if (error) { console.error('Fetch error:', error); return; }

    const tbody = document.getElementById(tableBodyId);
    tbody.innerHTML = ''; 

    players?.forEach(player => {
        const tr = document.createElement('tr');
        if (isAdmin) {
            tr.innerHTML = `
                <td style="font-weight: 600;">${player.first_name} ${player.last_name}</td>
                <td>${player.state_id}</td>
                <td>${player.fide_rating || 'Unrated'}</td>
                <td><button onclick="deletePlayer('${player.id}')" class="btn-orange" style="background:#E74C3C; padding: 0.5rem;">Delete</button></td>
            `;
        } else {
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--primary-blue);">${player.first_name} ${player.last_name}</td>
                <td>${player.state_id}</td>
                <td>${player.fide_id || '-'}</td>
                <td style="font-weight: 700; color: var(--accent-orange);">${player.fide_rating || 'Unrated'}</td>
                <td><span style="background: var(--bg-light); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${player.title || 'None'}</span></td>
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
    else { 
        alert('Saved!'); 
        document.getElementById('add-player-form').reset(); 
        fetchPlayers('admin-table-body', true); 
    }
}

async function deletePlayer(id) {
    if(confirm("Delete this player?")) {
        await supabase.from('players').delete().eq('id', id);
        fetchPlayers('admin-table-body', true); 
    }
}

// --- 4. SUPER ADMIN FUNCTIONS (Manage Users) ---

async function fetchUsersForSuperAdmin() {
    const { data: profiles } = await supabase.from('profiles').select('*').order('email');
    const tbody = document.getElementById('super-admin-table-body');
    if (!tbody) return; // Exit if not on the admin page
    
    tbody.innerHTML = '';

    profiles?.forEach(profile => {
        const btnText = profile.is_admin ? "Remove Admin Tag" : "Give Admin Tag";
        const btnColor = profile.is_admin ? "#E74C3C" : "var(--primary-blue)";
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${profile.email} ${profile.is_super_admin ? '<strong>(Super)</strong>' : ''}</td>
            <td style="font-weight:bold; color:${profile.is_admin ? '#27AE60' : '#7F8C8D'}">${profile.is_admin ? 'Admin' : 'User'}</td>
            <td>
                ${!profile.is_super_admin ? `<button onclick="toggleAdmin('${profile.id}', ${profile.is_admin})" style="background:${btnColor}; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:600;">${btnText}</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function toggleAdmin(id, currentStatus) {
    await supabase.from('profiles').update({ is_admin: !currentStatus }).eq('id', id);
    fetchUsersForSuperAdmin(); // Refresh the list automatically
}
