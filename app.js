// 1. Initialize Supabase
const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- AUTHENTICATION FUNCTIONS ---

async function handleLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) {
        console.error("Login error:", error.message);
        return false;
    }
    return true;
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

// --- DATABASE FUNCTIONS ---

async function fetchPlayers(tableBodyId, isAdmin = false) {
    const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .order('fide_rating', { ascending: false });

    if (error) { console.error('Error fetching players:', error); return; }

    const tbody = document.getElementById(tableBodyId);
    tbody.innerHTML = ''; 

    players.forEach(player => {
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

    if (error) {
        alert('Error adding player: ' + error.message);
    } else {
        alert('Player added successfully!');
        document.getElementById('add-player-form').reset();
        fetchPlayers('admin-table-body', true);
    }
}

async function deletePlayer(id) {
    if(confirm("Delete this player?")) {
        const { error } = await supabase.from('players').delete().eq('id', id);
        if (error) alert('Error: ' + error.message);
        else fetchPlayers('admin-table-body', true); 
    }
}
