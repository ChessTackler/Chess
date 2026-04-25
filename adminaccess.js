// ==========================================
// REGISTRATION REVIEW PORTAL LOGIC
// ==========================================

window.allRegistrations = [];
window.filteredRegistrations = [];
window.regCurrentPage = 1;
window.regPageSize = 15;

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

window.fetchRegisteredList = async function() {
    if (!window.supabaseClient) return;

    const { data, error } = await window.supabaseClient
        .from('player_database')
        .select('*')
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
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 3rem;">No players found matching your search.</td></tr>`;
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
            <td style="font-weight:600;">${fullName}</td>
            <td>${displayPhone}</td>
            <td>${displayId}</td>
            <td>${displayStatus}</td>
            <td style="text-align: right;">
                <button class="action-btn promote" style="background: white; border: 1px solid var(--border-color); color: var(--text-dark);">View Details ↗</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// SECURE BUCKET LOGIC (SIGNED URLS)
// ==========================================

async function getSecureSignedUrl(pathOrUrl) {
    if (!pathOrUrl) return '';

    try {
        let filePath = pathOrUrl;
        
        // Failsafe: If it's an old record that still has a full URL, extract just the path
        if (filePath.includes('http')) {
            const match = filePath.match(/player_documents\/(.+)$/);
            if (match && match[1]) filePath = match[1].split('?')[0]; 
        }
        
        // Request a highly secure 1-hour access token from Supabase
        const { data, error } = await window.supabaseClient.storage
            .from('player_documents')
            .createSignedUrl(filePath, 3600);
            
        if (error) {
            console.error("Supabase Signed URL Error:", error.message);
            return '';
        }
        
        return data?.signedUrl || '';
    } catch (e) {
        console.error("Error generating signed URL", e);
        return '';
    }
}

window.openSecureDetails = async function(id) {
    const player = window.registeredData.find(p => p.id === id);
    if (!player) return;

    // Loading overlay
    const loadingHTML = `
        <div style="text-align:center; padding:2rem;">
            <div class="loader" style="margin:0 auto; width:30px; height:30px; border:3px solid #e2e8f0; border-top-color:var(--primary-blue); border-radius:50%; animation:spin 1s linear infinite;"></div>
            <p style="margin-top:1rem; color:var(--text-muted); font-weight:600;">Decrypting and loading private documents...</p>
        </div>
    `;
    window.showModal('🔐 Securing Connection', loadingHTML, '');

    // Generate secure links
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
                <div class="detail-row"><span class="detail-label">Full Name</span> <span class="detail-value">${window.escapeHTML(player.first_name)} ${window.escapeHTML(player.last_name || '')}</span></div>
                <div class="detail-row"><span class="detail-label">Gender</span> <span class="detail-value">${window.escapeHTML(player.gender || 'N/A')}</span></div>
                <div class="detail-row"><span class="detail-label">Date of Birth</span> <span class="detail-value">${window.escapeHTML(player.dob || 'N/A')}</span></div>
                <div class="detail-row"><span class="detail-label">Email</span> <span class="detail-value">${window.escapeHTML(player.email || 'N/A')}</span></div>
                <div class="detail-row"><span class="detail-label">Mobile Number</span> <span class="detail-value">${window.escapeHTML(player.phone || 'N/A')}</span></div>
                <div class="detail-row"><span class="detail-label">UTR Number</span> <span class="detail-value" style="font-family: monospace;">${window.escapeHTML(player.utr_number || 'N/A')}</span></div>
            </div>

            <h4 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">Private Documents</h4>
            <div class="document-grid">
                <div class="doc-card">
                    <img src="${securePhotoUrl || noFileImg}" alt="Photo" onerror="this.src='${fallbackImg}'">
                    ${securePhotoUrl ? `<a href="${securePhotoUrl}" target="_blank">View Photo ↗</a>` : `<span style="color:#ef4444; font-size:0.85rem;">Missing</span>`}
                </div>
                <div class="doc-card">
                    <img src="${secureAadhaarUrl || noFileImg}" alt="Aadhaar" onerror="this.src='${fallbackImg}'">
                    ${secureAadhaarUrl ? `<a href="${secureAadhaarUrl}" target="_blank">View Aadhaar ↗</a>` : `<span style="color:#ef4444; font-size:0.85rem;">Missing</span>`}
                </div>
                <div class="doc-card">
                    <img src="${securePaymentUrl || noFileImg}" alt="Payment Proof" onerror="this.src='${fallbackImg}'">
                    ${securePaymentUrl ? `<a href="${securePaymentUrl}" target="_blank">View Proof ↗</a>` : `<span style="color:#ef4444; font-size:0.85rem;">Missing</span>`}
                </div>
            </div>
            <p style="font-size: 0.8rem; color: #94a3b8; text-align: center; margin-top: 15px;">Document access tokens expire automatically in 1 hour.</p>
        </div>
    `;

    let footerHTML = `<button class="modal-btn modal-btn-cancel" onclick="window.closeModal()">Close</button>`;
    
    if (player.id_status === 'Pending') {
        footerHTML += `<button class="modal-btn modal-btn-confirm" onclick="window.approveRegistration('${player.id}')" style="background: #10b981;">Mark as Active</button>`;
    }

    window.showModal('📋 Player Details', bodyHTML, footerHTML);
}

window.approveRegistration = async function(id) {
    if (!window.supabaseClient) return;
    
    window.uiConfirm('Mark as Active?', 'This will approve the player and mark their ID as Active.', 'Confirm', async () => {
        const { error } = await window.supabaseClient
            .from('player_database')
            .update({ id_status: 'Active' })
            .eq('id', id);
            
        if (error) {
            window.uiAlert('Failed', error.message, true);
        } else {
            window.uiAlert('Success', 'Player status updated successfully!');
            window.fetchRegisteredList(); 
        }
    });
}
