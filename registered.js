window.registeredData = [];

document.addEventListener('DOMContentLoaded', async () => {
    const authMessage = document.getElementById('auth-message');
    const adminContent = document.getElementById('admin-content');

    const auth = await window.verifyAdminAccess();

    if (!auth.allowed) {
        authMessage.innerHTML = `<span style="color: #ef4444; font-size: 2.5rem;">🔒</span><br><br><span style="color:var(--text-dark); font-weight:800;">Access Denied.</span><br><span style="font-size:1rem; font-weight:400; display:block; margin-top:10px; color:var(--text-muted);">Admin privileges required.</span>`;
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    } else {
        authMessage.style.display = 'none';
        adminContent.style.display = 'block';
        window.fetchRegisteredList();
    }
});

// LOGIC UPDATE: ONLY FETCH 'Active' PLAYERS FOR THE VAULT
window.fetchRegisteredList = async function() {
    if (!window.supabaseClient) return;

    const { data, error } = await window.supabaseClient
        .from('player_database')
        .select('*')
        .eq('id_status', 'Active') // Explicitly filters for secure vault
        .order('created_at', { ascending: false });

    if (error) {
        window.uiAlert('Database Error', error.message, true);
        return;
    }

    window.registeredData = data || [];
    window.filterRegisteredList();
}

window.filterRegisteredList = function() {
    const searchQuery = (document.getElementById('regSearchInput').value || "").toLowerCase().trim();
    const tbody = document.getElementById('registered-tbody');

    const filtered = window.registeredData.filter(p => {
        const searchStr = `${p.first_name} ${p.last_name || ''} ${p.phone || ''}`.toLowerCase();
        return searchStr.includes(searchQuery);
    });

    tbody.innerHTML = ''; 

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 3rem;">No active directory records found.</td></tr>`;
        return;
    }

    filtered.forEach(player => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.onclick = () => window.openSecureDetails(player.id);

        const fullName = window.escapeHTML(`${player.first_name} ${player.last_name || ''}`.trim());
        const displayPhone = player.phone ? window.escapeHTML(player.phone) : '<span style="color:#94a3b8; font-style:italic;">Not provided</span>';
        const displayId = `<strong style="color: var(--primary-dark); font-family: monospace;">${window.escapeHTML(player.cdca_id)}</strong>`;
        const displayStatus = window.formatStatusBadge(player.id_status);

        tr.innerHTML = `
            <td style="font-weight:600; cursor:pointer;">${fullName}</td>
            <td style="cursor:pointer;">${displayPhone}</td>
            <td style="cursor:pointer;">${displayId}</td>
            <td style="cursor:pointer;">${displayStatus}</td>
            <td style="text-align: right;">
                <button class="action-btn promote" style="background: white; border: 1px solid var(--border-color); color: var(--text-dark);">View Docs ↗</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function getSecureSignedUrl(originalUrl) {
    if (!originalUrl) return '';
    try {
        const match = originalUrl.match(/player_documents\/(.+)$/);
        if (match && match[1]) {
            const filePath = match[1];
            const { data } = await window.supabaseClient.storage
                .from('player_documents')
                .createSignedUrl(filePath, 3600); 
            if (data && data.signedUrl) return data.signedUrl;
        }
    } catch (e) {}
    return ''; 
}

window.openSecureDetails = async function(id) {
    const player = window.registeredData.find(p => p.id === id);
    if (!player) return;

    const loadingHTML = `
        <div style="text-align:center; padding:2rem;">
            <div class="loader" style="margin:0 auto; width:30px; height:30px; border:3px solid #e2e8f0; border-top-color:var(--primary-blue); border-radius:50%; animation:spin 1s linear infinite;"></div>
            <p style="margin-top:1rem; color:var(--text-muted); font-weight:600;">Generating secure access tokens...</p>
        </div>
    `;
    window.showModal('🔐 Securing Connection', loadingHTML, '');

    const securePhotoUrl = await getSecureSignedUrl(player.photo_url);
    const secureAadhaarUrl = await getSecureSignedUrl(player.aadhaar_url);
    const securePaymentUrl = await getSecureSignedUrl(player.payment_proof_url);

    const fallbackImg = 'https://via.placeholder.com/150x150/f8fafc/94a3b8?text=📄+PDF/Doc';
    const noFileImg = 'https://via.placeholder.com/150x150/fee2e2/ef4444?text=No+File';

    const bodyHTML = `
        <div style="max-height: 70vh; overflow-y: auto; padding-right: 10px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; text-align: center;">
                <span style="font-size: 0.85rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Player CDCA ID</span>
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary-dark); font-family: monospace;">${window.escapeHTML(player.cdca_id)}</div>
                <div style="margin-top: 5px;">${window.formatStatusBadge(player.id_status)}</div>
            </div>
            <h4 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">Complete Profile</h4>
            <div style="margin-bottom: 1.5rem;">
                <div style="display:grid; grid-template-columns:1fr 2fr; margin-bottom:5px;"><span style="color:#64748b; font-size:0.85rem; font-weight:700;">Full Name</span> <span style="font-weight:500;">${window.escapeHTML(player.first_name)} ${window.escapeHTML(player.last_name || '')}</span></div>
                <div style="display:grid; grid-template-columns:1fr 2fr; margin-bottom:5px;"><span style="color:#64748b; font-size:0.85rem; font-weight:700;">Mobile</span> <span style="font-weight:500;">${window.escapeHTML(player.phone || 'N/A')}</span></div>
                <div style="display:grid; grid-template-columns:1fr 2fr; margin-bottom:5px;"><span style="color:#64748b; font-size:0.85rem; font-weight:700;">Email</span> <span style="font-weight:500;">${window.escapeHTML(player.email || 'N/A')}</span></div>
            </div>
            <h4 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">Private Documents</h4>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; text-align:center;">
                <div>
                    <img src="${securePhotoUrl || noFileImg}" alt="Photo" onerror="this.src='${fallbackImg}'" style="width:100%; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:5px;">
                    ${securePhotoUrl ? `<a href="${securePhotoUrl}" target="_blank" style="font-size:0.8rem;">View Photo</a>` : `<span style="color:#ef4444; font-size:0.8rem;">Missing</span>`}
                </div>
                <div>
                    <img src="${secureAadhaarUrl || noFileImg}" alt="Aadhaar" onerror="this.src='${fallbackImg}'" style="width:100%; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:5px;">
                    ${secureAadhaarUrl ? `<a href="${secureAadhaarUrl}" target="_blank" style="font-size:0.8rem;">View Aadhaar</a>` : `<span style="color:#ef4444; font-size:0.8rem;">Missing</span>`}
                </div>
                <div>
                    <img src="${securePaymentUrl || noFileImg}" alt="Proof" onerror="this.src='${fallbackImg}'" style="width:100%; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:5px;">
                    ${securePaymentUrl ? `<a href="${securePaymentUrl}" target="_blank" style="font-size:0.8rem;">View Proof</a>` : `<span style="color:#ef4444; font-size:0.8rem;">Missing</span>`}
                </div>
            </div>
            <p style="font-size: 0.8rem; color: #94a3b8; text-align: center; margin-top: 15px;">Document access tokens expire automatically in 1 hour.</p>
        </div>
    `;

    // Only close button for Directory Vault
    let footerHTML = `<button class="modal-btn modal-btn-cancel" onclick="window.closeModal()">Close</button>`;
    window.showModal('📋 Secure Dossier', bodyHTML, footerHTML);
}
