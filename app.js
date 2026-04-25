const supabaseUrl = 'https://vwzcdfgbqaszhqlvewch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3emNkZmdicWFzemhxbHZld2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDc4MTgsImV4cCI6MjA5MjYyMzgxOH0.SBEcDqvAkpvxyVV2eSxuvYt-0Ehst5B0_dxI9u0eTRQ';

// Safely initialize and attach to 'window' to avoid cross-script scope collisions
if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
    console.error("Supabase CDN not loaded. Check internet connection.");
}

// --- DYNAMIC NAVBAR RENDERING ---
async function updateNavbar() {
    const nav = document.getElementById('main-nav');
    if (!nav) return; 

    if (!window.supabaseClient) {
        nav.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="color: #E74C3C; font-weight: 600; font-size: 0.85rem;">Database Offline</span>
                <a href="login.html" class="nav-auth-btn">Log In</a>
                <a href="signup.html" class="btn-orange" style="padding: 0.6rem 1.2rem;">Sign Up</a>
            </div>
        `;
        return;
    }

    try {
        const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;

        let navHTML = `<a href="#">Tournaments</a><a href="#">Rankings</a>`;

        if (session) {
            const { data: profile } = await window.supabaseClient
                .from('profiles')
                .select('is_admin')
                .eq('id', session.user.id)
                .single();

            if (profile && profile.is_admin) {
                navHTML += `
                    <a href="admin.html" style="color: var(--accent-orange);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 4px;">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        Admin Panel
                    </a>`;
            }
            
            navHTML += `
                <a href="#" onclick="handleLogout()" class="nav-auth-btn" style="color: #E74C3C; border-left: 1px solid var(--border-color); padding-left: 1.5rem; margin-left: 0.5rem;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Logout
                </a>`;
        } else {
            navHTML += `
                <div style="display: flex; align-items: center; gap: 1rem; border-left: 1px solid var(--border-color); padding-left: 1rem; margin-left: 0.5rem;">
                    <a href="login.html" class="nav-auth-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                        Log In
                    </a>
                    <a href="signup.html" class="btn-orange" style="padding: 0.6rem 1.2rem;">Sign Up</a>
                </div>
            `;
        }
        nav.innerHTML = navHTML;

    } catch (error) {
        console.error("Navbar Error:", error);
        nav.innerHTML = `<a href="login.html" class="nav-auth-btn">Log In</a><a href="signup.html" class="btn-orange" style="padding: 0.6rem 1.2rem;">Sign Up</a>`;
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

    if (!window.supabaseClient) {
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 4 : 5}" style="text-align: center; color: #E74C3C;">Database connection failed.</td></tr>`;
        return;
    }

    const { data: players, error } = await window.supabaseClient
        .from('players')
        .select('*')
        .order('fide_rating', { ascending: false });

    if (error) { 
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 4 : 5}" style="text-align: center; color: #E74C3C;">Error loading players.</td></tr>`;
        return; 
    }

    tbody.innerHTML = ''; 
    if (players.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 4 : 5}" style="text-align: center; color: var(--text-muted);">No players found in database.</td></tr>`;
        return;
    }

    players.forEach(player => {
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
    if (!window.supabaseClient) return alert("Database offline.");
    if(confirm("Delete this player?")) {
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
        const btnText = profile.is_admin ? "Remove Admin Tag" : "Give Admin Tag";
        const btnColor = profile.is_admin ? "#E74C3C" : "var(--primary-blue)";
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${profile.email} ${profile.is_super_admin ? '<strong>(Super)</strong>' : ''}</td>
            <td style="font-weight:bold; color:${profile.is_admin ? '#27AE60' : '#7F8C8D'}">${profile.is_admin ? 'Admin' : 'User'}</td>
            <td>${!profile.is_super_admin ? `<button onclick="toggleAdmin('${profile.id}', ${profile.is_admin})" style="background:${btnColor}; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:600;">${btnText}</button>` : '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function toggleAdmin(id, currentStatus) {
    if (!window.supabaseClient) return;
    await window.supabaseClient.from('profiles').update({ is_admin: !currentStatus }).eq('id', id);
    fetchUsersForSuperAdmin(); 
}
