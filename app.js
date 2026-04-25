const supabaseUrl = 'https://vwzcdfgbqaszhqlvewch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3emNkZmdicWFzemhxbHZld2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDc4MTgsImV4cCI6MjA5MjYyMzgxOH0.SBEcDqvAkpvxyVV2eSxuvYt-0Ehst5B0_dxI9u0eTRQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- DYNAMIC NAVBAR RENDERING ---
async function updateNavbar() {
    const nav = document.getElementById('main-nav');
    if (!nav) return; 

    const { data: { session } } = await supabase.auth.getSession();
    let navHTML = `<a href="#">Tournaments</a><a href="#">Rankings</a>`;

    if (session) {
        const { data: profile } = await supabase
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
}

// --- AUTHENTICATION LOGIC ---
async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

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

// --- DATABASE OPERATIONS (Players) ---
async function fetchPlayers(tableBodyId, isAdmin = false) {
    const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .order('fide_rating', { ascending: false });

    if (error) { console.error('Fetch error:', error); return; }

    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;
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

async function addPlayer(event) {
    event.preventDefault(); // Prevent form submission from reloading page
    const newPlayer = {
        first_name: document.getElementById('first_name').value,
        last_name: document.getElementById('last_name').value,
        state_id: document.getElementById('state_id').value,
        fide_id: document.getElementById('fide_id').value || null,
        fide_rating: document.getElementById('fide_rating').value || null,
        title: document.getElementById('title').value || null
    };
    const { error } = await supabase.from('players').insert([newPlayer]);
    if (error) alert('Error: ' + error.message);
    else { 
        alert('Player Saved Successfully!'); 
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

// --- SUPER ADMIN FUNCTIONS (Manage Users) ---
async function fetchUsersForSuperAdmin() {
    const { data: profiles } = await supabase.from('profiles').select('*').order('email');
    const tbody = document.getElementById('super-admin-table-body');
    if (!tbody) return; 

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
    await supabase.from('profiles').update({ is_admin: !currentStatus }).eq('id', id);
    fetchUsersForSuperAdmin(); 
}
