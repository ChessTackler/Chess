// --- INITIALIZATION WITH SAFETY CHECK ---
const supabaseUrl = 'https://vwzcdfgbqaszhqlvewch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3emNkZmdicWFzemhxbHZld2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDc4MTgsImV4cCI6MjA5MjYyMzgxOH0.SBEcDqvAkpvxyVV2eSxuvYt-0Ehst5B0_dxI9u0eTRQ';

if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
    console.error("Supabase CDN not loaded.");
}

// --- DYNAMIC NAVBAR RENDERING ---
async function updateNavbar() {
    const nav = document.getElementById('main-nav');
    if (!nav) return; 

    // 1. These base links will ALWAYS be visible to everyone
    const baseLinks = `
        <a href="#">Tournaments</a>
        <a href="#">Rankings</a>
    `;

    // 2. Fallback if database is offline completely
    if (!window.supabaseClient) {
        nav.innerHTML = baseLinks + `
            <div style="display: flex; align-items: center; gap: 1rem; border-left: 1px solid var(--border-color); padding-left: 1rem; margin-left: 0.5rem;">
                <a href="login.html" class="nav-auth-btn">Log In</a>
                <a href="signup.html" class="btn-orange" style="padding: 0.6rem 1.2rem;">Sign Up</a>
            </div>
        `;
        return;
    }

    // 3. Normal Execution Flow
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();

        if (session) {
            // User is logged in. Check if they are an Admin.
            const { data: profile } = await window.supabaseClient
                .from('profiles')
                .select('is_admin')
                .eq('id', session.user.id)
                .single();

            // Create the Admin link ONLY if they are an admin
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
            
            // Render Base Links + Optional Admin Link + Logout Button
            nav.innerHTML = baseLinks + adminLink + `
                <a href="#" onclick="handleLogout()" class="nav-auth-btn" style="color: #E74C3C; border-left: 1px solid var(--border-color); padding-left: 1.5rem; margin-left: 0.5rem;">
                    Logout
                </a>`;
                
        } else {
            // User is NOT logged in. Show standard login/signup
            nav.innerHTML = baseLinks + `
                <div style="display: flex; align-items: center; gap: 1rem; border-left: 1px solid var(--border-color); padding-left: 1rem; margin-left: 0.5rem;">
                    <a href="login.html" class="nav-auth-btn">Log In</a>
                    <a href="signup.html" class="btn-orange" style="padding: 0.6rem 1.2rem;">Sign Up</a>
                </div>
            `;
        }

    } catch (error) {
        // Ultimate fallback
        nav.innerHTML = baseLinks + `<a href="login.html" class="nav-auth-btn">Log In</a>`;
    }
}

// --- AUTHENTICATION LOGIC ---
async function handleLogout() {
    if (!window.supabaseClient) return;
    await window.supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

async function verifyAdminAccess() {
    if (!window.supabaseClient) return { allowed: false, error: "Database offline." };
    
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return { allowed: false };

    const { data: profile, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !profile || !profile.is_admin) {
        return { allowed: false, error: "Access Denied: You do not have Admin privileges." };
    }
    return { allowed: true, is_super_admin: profile.is_super_admin, email: profile.email };
}

// --- DATABASE OPERATIONS (Players) ---
async function fetchPlayers(tableBodyId, isAdmin = false) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;

    if (!window.supabaseClient) return;

    const { data: players, error } = await window.supabaseClient
        .from('players')
        .select('*')
        .order('fide_rating', { ascending: false });

    if (error) return; 

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
                <td><button onclick="deletePlayer('${player.id}')" class="action-btn delete">Delete</button></td>
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

async function addPlayer(event) {
    event.preventDefault(); 
    if (!window.supabaseClient) return alert("Cannot add player: Database offline.");

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
        alert('Error: ' + error.message);
    } else { 
        alert('Player Saved Successfully!'); 
        document.getElementById('add-player-form').reset(); 
        fetchPlayers('admin-table-body', true); 
    }
}

async function deletePlayer(id) {
    if (!window.supabaseClient) return;
    if(confirm("Delete this player permanently?")) {
        await window.supabaseClient.from('players').delete().eq('id', id);
        fetchPlayers('admin-table-body', true); 
    }
}

// --- SUPER ADMIN FUNCTIONS (Manage Users) ---
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
            <td><strong style="color:var(--text-dark);">${profile.email}</strong> ${profile.is_super_admin ? ' <span style="font-size:0.8rem;">👑</span>' : ''}</td>
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
