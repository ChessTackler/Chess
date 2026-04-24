// Initialize Supabase
const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
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
