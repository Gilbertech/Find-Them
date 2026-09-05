// ============================================================
// FindMe — main app logic (backed by Supabase)
// ============================================================

let currentSession = null;
let currentProfile = null;
let uploadedPhotoFile = null;
let uploadedProfilePhotoFile = null;
let uploadedTestimonialPhotoFile = null;
let currentStatusFilter = "all";
let currentCountyFilter = "all";
let allPosts = [];
let activeResolvePostId = null;
let activeTipPostId = null;
let pendingPostFormData = null;

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentSession = session;

  if (session) {
    currentProfile = await getCurrentProfile();
    showPage("dashboard");
    initDashboard();
  } else {
    showPage("landing-page");
    loadLandingStats();
    loadTestimonials();
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
  });

  document.getElementById("photo-upload")?.addEventListener("change", handlePhotoSelect);
  document.getElementById("post-form")?.addEventListener("submit", handlePostSubmit);
  document.getElementById("tip-form")?.addEventListener("submit", handleTipSubmit);
  document.getElementById("resolve-form")?.addEventListener("submit", handleResolveSubmit);
  document.getElementById("testimonial-form")?.addEventListener("submit", handleTestimonialSubmit);
  document.getElementById("search-input")?.addEventListener("input", debounce(handleSearch, 250));

  const testimonialFileInput = document.getElementById("testimonial-photo-file");
  if (testimonialFileInput) {
    testimonialFileInput.addEventListener("change", handleTestimonialPhotoSelect);
  }

  document.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) {
      event.target.classList.add("hidden");
    }
    const menu = document.getElementById("hamburger-menu");
    const profileDropdown = document.querySelector(".profile-dropdown");
    if (menu && !menu.classList.contains("hidden") && !menu.contains(event.target) && !profileDropdown?.contains(event.target)) {
      menu.classList.add("hidden");
    }
  });
});

function showPage(pageId) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById(pageId)?.classList.add("active");
}

// ==========================================
// Landing page
// ==========================================
async function loadLandingStats() {
  const { data, error } = await supabaseClient.from("site_stats").select("*").single();
  if (error) {
    console.error("Failed to load stats:", error.message);
    return;
  }
  document.getElementById("stat-members").textContent = data.member_count ?? 0;
  document.getElementById("stat-found").textContent = data.found_count ?? 0;
  document.getElementById("stat-active").textContent = data.active_count ?? 0;
}

async function loadTestimonials() {
  const { data, error } = await supabaseClient
    .from("testimonials")
    .select("*")
    .eq("is_approved", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(6);

  const container = document.getElementById("found-stories");
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);width:100%;">No testimonials published yet.</p>';
    return;
  }

  container.innerHTML = data.map((t) => `
    <div class="story-card active">
      <div class="story-image">
        <img src="${t.photo_url || placeholderAvatar(t.author_name)}" alt="${escapeHtml(t.author_name)}" onerror="this.src='${placeholderAvatar(t.author_name)}'">
      </div>
      <div class="story-content">
        <h4>${escapeHtml(t.author_name)}</h4>
        <p>"${escapeHtml(t.quote)}"</p>
        <div class="story-meta">
          <span class="story-location">${escapeHtml(t.location || "")}</span>
        </div>
      </div>
    </div>
  `).join("");
}

// ==========================================
// Dashboard init
// ==========================================
async function initDashboard() {
  if (!currentProfile) {
    await signOutAndRedirect();
    return;
  }

  const fullName = `${currentProfile.first_name} ${currentProfile.last_name}`.trim() || currentProfile.email;
  const avatarUrl = currentProfile.avatar_url || placeholderAvatar(fullName);

  document.getElementById("header-avatar").src = avatarUrl;
  document.getElementById("creator-avatar").src = avatarUrl;
  document.getElementById("menu-avatar").src = avatarUrl;
  document.getElementById("menu-user-name").textContent = fullName;
  document.getElementById("menu-user-email").textContent = currentProfile.email;

  let roleBadge = currentProfile.role === "admin"
    ? '<span class="user-role-badge role-admin">ADMIN</span>'
    : '<span class="user-role-badge role-user">USER</span>';
    
  if (currentProfile.role === "police") {
    roleBadge = '<span class="user-role-badge" style="background: #2c3e50; color: white;">POLICE OFFICER</span>';
  }

  document.getElementById("welcome-heading").innerHTML = `Welcome back, ${escapeHtml(currentProfile.first_name || "there")}! ${roleBadge}`;

  if (currentProfile.role === "admin") {
    document.getElementById("admin-nav-item")?.classList.remove("hidden");
  }
  if (currentProfile.role === "police") {
    document.getElementById("police-nav-item")?.classList.remove("hidden");
  }

  populateCountyFilter();
  await loadFeed();
  await refreshNotificationBadge();
}

function toggleHamburgerMenu() {
  document.getElementById("hamburger-menu")?.classList.toggle("hidden");
}

function showTab(tabId) {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  document.querySelector(`.nav-item[data-tab="${tabId}"]`)?.classList.add("active");

  document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
  document.getElementById(`${tabId}-tab`)?.classList.add("active");

  if (tabId === "mine") loadMyPosts();
  if (tabId === "admin") loadAdminData();
  if (tabId === "police") loadPoliceQueue(); // NEW: Police Queue
  if (tabId === "notifications") loadNotifications();
}

const KENYA_COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay",
  "Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu",
  "Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Meru","Migori",
  "Marsabit","Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyamira",
  "Nyandarua","Nyeri","Samburu","Siaya","Taita Taveta","Tana River","Tharaka Nithi",
  "Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot",
];

function populateCountyFilter() {
  const select = document.getElementById("county-filter");
  if (!select || select.dataset.populated) return;
  select.innerHTML = '<option value="all">All Counties</option>' +
    KENYA_COUNTIES.map((c) => `<option value="${c}">${c}</option>`).join("");
  select.dataset.populated = "true";
  select.addEventListener("change", () => {
    currentCountyFilter = select.value;
    renderFeed();
  });
}

// ==========================================
// Feed
// ==========================================
async function loadFeed() {
  const loadingEl = document.getElementById("feed-loading");
  const feedEl = document.getElementById("feed-posts");
  loadingEl.style.display = "block";
  feedEl.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("missing_persons")
    .select("*, profiles:reporter_id(first_name, last_name, avatar_url)")
    .order("created_at", { ascending: false });

  loadingEl.style.display = "none";

  if (error) {
    showToast(error.message, "error");
    return;
  }

  allPosts = data || [];
  renderFeed();
}

function renderFeed() {
  const feedEl = document.getElementById("feed-posts");
  const emptyEl = document.getElementById("feed-empty");

  let posts = allPosts;
  if (currentStatusFilter !== "all") {
    posts = posts.filter((p) => p.status === currentStatusFilter);
  }
  if (currentCountyFilter !== "all") {
    posts = posts.filter((p) => p.county === currentCountyFilter);
  }

  const query = document.getElementById("search-input")?.value.trim().toLowerCase();
  if (query) {
    posts = posts.filter((p) =>
      `${p.first_name} ${p.last_name} ${p.last_location} ${p.description}`.toLowerCase().includes(query)
    );
  }

  if (posts.length === 0) {
    feedEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  feedEl.innerHTML = posts.map((p) => renderPostCard(p)).join("");
}

function renderPostCard(post) {
  const reporterName = post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}`.trim() : "FindMe user";
  const isOwner = currentProfile && post.reporter_id === currentProfile.id;
  const isAdmin = currentProfile && currentProfile.role === "admin";
  const isPolice = currentProfile && currentProfile.role === "police";
  const canManage = isOwner || isAdmin;

  // Updated status display to show police verification
  let statusLabel = post.status.toUpperCase();
  let statusClass = post.status;
  
  if (post.status === 'found_pending') {
    if (post.police_verified) {
      statusLabel = '✓ POLICE VERIFIED';
      statusClass = 'pending-verified';
    } else {
      statusLabel = '⏳ AWAITING POLICE';
      statusClass = 'pending';
    }
  }

  const resolutionNoteHtml = (post.status === "found_pending" || post.status === "found") && post.resolution_note
    ? `<div class="admin-note-box"><strong>Update from reporter:</strong> ${escapeHtml(post.resolution_note)}</div>`
    : "";

  const policeVerificationHtml = post.police_verified && post.police_ob_number
    ? `<div style="background:#e8f5e9; padding:0.75rem; border-radius:6px; margin-top:0.5rem; border-left:3px solid var(--success-green);">
         <strong style="color:var(--success-green);"><i class="fas fa-shield-alt"></i> Police Verified</strong>
         <p style="margin:0.25rem 0 0; font-size:0.85rem;">OB Number: <strong>${escapeHtml(post.police_ob_number)}</strong></p>
       </div>`
    : "";

  const reporterAvatar = post.profiles?.avatar_url || placeholderAvatar(reporterName);
  const locationLabel = post.county ? `${escapeHtml(post.last_location)}, ${escapeHtml(post.county)}` : escapeHtml(post.last_location);

  return `
    <article class="post-card" data-id="${post.id}">
      <div class="post-header">
        <img src="${reporterAvatar}" alt="Reporter" class="avatar" onerror="this.src='${placeholderAvatar(reporterName)}'">
        <div class="post-info">
          <h4>${escapeHtml(reporterName)}</h4>
          <span class="post-time">${formatTimeAgo(new Date(post.created_at))} • ${locationLabel}</span>
        </div>
        <div class="post-status ${statusClass}">${statusLabel}</div>
      </div>
      <div class="post-content">
        <p>${escapeHtml(post.description)}</p>
        <div class="missing-person-details">
          <img src="${post.photo_url || placeholderAvatar(post.first_name)}" alt="Missing person" class="missing-photo" onerror="this.src='${placeholderAvatar(post.first_name)}'">
          <div class="details">
            <div class="detail-item"><strong>Name:</strong> ${escapeHtml(post.first_name)} ${escapeHtml(post.last_name)}</div>
            <div class="detail-item"><strong>Age:</strong> ${post.age} years old</div>
            <div class="detail-item"><strong>Gender:</strong> ${escapeHtml(post.gender)}</div>
            <div class="detail-item"><strong>Last Seen:</strong> ${new Date(post.last_seen_at).toLocaleString()}</div>
            <div class="detail-item"><strong>Contact:</strong> ${escapeHtml(post.contact_phone)}</div>
          </div>
        </div>
        ${resolutionNoteHtml}
        ${policeVerificationHtml}
      </div>
      <div class="post-actions">
        <button class="action-btn" onclick="sharePost('${post.id}')">
          <i class="fas fa-share"></i> Share (<span class="share-count">${post.share_count || 0}</span>)
        </button>
        <button class="action-btn" onclick="showTipModal('${post.id}')">
          <i class="fas fa-comment"></i> Provide Tip
        </button>
        <button class="action-btn" onclick="callFamily('${post.contact_phone}')">
          <i class="fas fa-phone"></i> Contact
        </button>
        <button class="action-btn" onclick="printFlyer('${post.id}')">
          <i class="fas fa-print"></i> Print Flyer
        </button>
        ${canManage || isPolice ? `
          <button class="action-btn" onclick="viewTips('${post.id}')">
            <i class="fas fa-list"></i> View Tips
          </button>` : ""}
        ${canManage && (post.status === "urgent" || post.status === "missing") ? `
          <button class="action-btn" onclick="showResolveModal('${post.id}')">
            <i class="fas fa-check-circle"></i> Mark Found
          </button>` : ""}
        ${canManage ? `
          <button class="action-btn" onclick="deletePost('${post.id}')">
            <i class="fas fa-trash"></i> Delete
          </button>` : ""}
      </div>
    </article>
  `;
}

function filterByStatus(status) {
  currentStatusFilter = status;
  document.querySelectorAll("#status-filter .status-tab").forEach((t) => t.classList.remove("active"));
  document.querySelector(`#status-filter .status-tab[data-status="${status}"]`)?.classList.add("active");
  renderFeed();
}

function handleSearch() {
  renderFeed();
}

// ==========================================
// My Reports
// ==========================================
async function loadMyPosts() {
  const container = document.getElementById("my-posts");
  const emptyEl = document.getElementById("my-posts-empty");
  container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:1rem;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';

  const { data, error } = await supabaseClient
    .from("missing_persons")
    .select("*, profiles:reporter_id(first_name, last_name, avatar_url)")
    .eq("reporter_id", currentProfile.id)
    .order("created_at", { ascending: false });

  if (error) {
    showToast(error.message, "error");
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  container.innerHTML = data.map((p) => renderPostCard(p)).join("");
}

// ==========================================
// Post creation (WITH M-PESA SIMULATION)
// ==========================================
function showPostModal() {
  document.getElementById("post-modal").classList.remove("hidden");
}

function hidePostModal() {
  document.getElementById("post-modal").classList.add("hidden");
  document.getElementById("post-form").reset();
  removePhoto();
}

function handlePhotoSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { showToast("Please select a valid image file", "error"); return; }
  if (file.size > 5 * 1024 * 1024) { showToast("Image size must be less than 5MB", "error"); return; }

  uploadedPhotoFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("upload-label").classList.add("hidden");
    document.getElementById("photo-preview").classList.remove("hidden");
    document.getElementById("preview-image").src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removePhoto() {
  uploadedPhotoFile = null;
  const input = document.getElementById("photo-upload");
  if (input) input.value = "";
  document.getElementById("upload-label")?.classList.remove("hidden");
  document.getElementById("photo-preview")?.classList.add("hidden");
}

async function handlePostSubmit(event) {
  event.preventDefault();
  const form = event.target;

  if (!uploadedPhotoFile) {
    showToast("Please upload a photo of the missing person before proceeding.", "warning");
    return;
  }

  const formData = new FormData(form);
  showMpesaPaymentModal(50, formData);
}

function showMpesaPaymentModal(amount, formData) {
  pendingPostFormData = formData;

  const html = `
    <div style="padding: 2rem; text-align: center;">
      <div style="background: #4CAF50; color: white; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 2rem; font-weight: bold;">
        M
      </div>
      <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">M-Pesa Payment Required</h3>
      <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">To publish this missing person report, a small fee of <strong>KES ${amount}</strong> is required to prevent spam.</p>

      <div style="background: var(--light-gray); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: left;">
        <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Report for:</strong> ${formData.get('firstName')} ${formData.get('lastName')}</p>
        <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Last Seen:</strong> ${formData.get('lastLocation')}</p>
      </div>

      <div class="form-group" style="text-align: left;">
        <label>M-Pesa Phone Number</label>
        <input type="tel" id="mpesa-phone" placeholder="0712345678" style="width: 100%; padding: 12px; border: 2px solid var(--border-gray); border-radius: 8px; font-size: 16px;">
      </div>

      <div style="background: #e8f5e9; padding: 1rem; border-radius: 8px; margin: 1rem 0; border-left: 4px solid var(--success-green); text-align: left;">
        <p style="margin: 0; font-size: 0.9rem; color: #2e7d32;">
          <i class="fas fa-info-circle"></i> <strong>Simulation Mode:</strong> Enter any valid-looking number. An STK push will be simulated.
        </p>
      </div>

      <div class="form-actions" style="justify-content: center; margin-top: 1.5rem;">
        <button type="button" class="btn-secondary" onclick="hideSettingsModal()">Cancel</button>
        <button type="button" class="btn-primary" id="mpesa-pay-btn" style="background: #4CAF50;" onclick="processMpesaPayment(${amount})">
          <i class="fas fa-mobile-alt"></i> Pay KES ${amount}
        </button>
      </div>
    </div>
  `;
  showSettingsModal("Complete Payment via M-Pesa", html);
}

async function processMpesaPayment(amount) {
  const phone = document.getElementById('mpesa-phone').value.trim();
  if (!phone || phone.length < 10) {
    showToast("Please enter a valid M-Pesa phone number.", "error");
    return;
  }

  const btn = document.getElementById('mpesa-pay-btn');

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending STK Push...';
  await new Promise((resolve) => setTimeout(resolve, 1500));

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waiting for M-Pesa confirmation...';
  await new Promise((resolve) => setTimeout(resolve, 2500));

  btn.innerHTML = '<i class="fas fa-check"></i> Payment Successful!';
  btn.style.background = "#4CAF50";

  hideSettingsModal();
  await new Promise((resolve) => setTimeout(resolve, 500));

  showToast(`✅ M-Pesa payment of KES ${amount} successful! Publishing report...`, "success");

  try {
    await executePostSubmission(pendingPostFormData);
    pendingPostFormData = null;
  } catch (error) {
    showToast("Payment successful but failed to publish report. Please contact support.", "error");
    pendingPostFormData = null;
  }
}

async function executePostSubmission(formData) {
  try {
    let photoUrl = null;
    if (uploadedPhotoFile) {
      const fileExt = uploadedPhotoFile.name.split(".").pop();
      const filePath = `${currentProfile.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabaseClient.storage
        .from("missing-person-photos")
        .upload(filePath, uploadedPhotoFile);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseClient.storage.from("missing-person-photos").getPublicUrl(filePath);
      photoUrl = publicUrlData.publicUrl;
    }

    const payload = {
      reporter_id: currentProfile.id,
      first_name: formData.get("firstName").trim(),
      last_name: formData.get("lastName").trim(),
      age: parseInt(formData.get("age"), 10),
      gender: formData.get("gender"),
      last_location: formData.get("lastLocation").trim(),
      county: formData.get("county") || null,
      last_seen_at: new Date(formData.get("lastSeen")).toISOString(),
      description: formData.get("description").trim(),
      contact_phone: formData.get("contactPhone").trim(),
      alt_contact: formData.get("altContact")?.trim() || null,
      status: formData.get("status"), // Goes live immediately as 'urgent' or 'missing'
      photo_url: photoUrl,
      police_verified: false,
      police_ob_number: null
    };

    const { error: insertError } = await supabaseClient.from("missing_persons").insert(payload);
    if (insertError) throw insertError;

    hidePostModal();
    showToast("Report published successfully! The community has been notified.", "success");
    await loadFeed();
  } catch (err) {
    showToast("Failed to publish report: " + err.message, "error");
    throw err;
  }
}

// ==========================================
// Resolution workflow & Police Verification
// ==========================================
function showResolveModal(postId) {
  activeResolvePostId = postId;
  document.getElementById("resolve-modal").classList.remove("hidden");
}
function hideResolveModal() {
  activeResolvePostId = null;
  document.getElementById("resolve-modal").classList.add("hidden");
  document.getElementById("resolve-form").reset();
}

async function handleResolveSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const note = formData.get("resolutionNote").trim();

  // Sets status to found_pending, waiting for police
  const { error } = await supabaseClient
    .from("missing_persons")
    .update({ status: "found_pending", resolution_note: note })
    .eq("id", activeResolvePostId);

  if (error) { showToast(error.message, "error"); return; }

  hideResolveModal();
  showToast("Submitted for Police Verification. An officer will confirm shortly.", "success");
  await loadFeed();
  if (document.getElementById("mine-tab").classList.contains("active")) await loadMyPosts();
}

// NEW: Police Queue Loader
async function loadPoliceQueue() {
  const { data, error } = await supabaseClient
    .from("missing_persons")
    .select("*, profiles:reporter_id(first_name, last_name, phone)")
    .eq("status", "found_pending")
    .eq("police_verified", false)
    .order("created_at", { ascending: false });

  if (error) return;

  const container = document.getElementById("police-pending-table");
  if (!container) return;
  
  if (!data || data.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:3rem; background:white; border-radius:12px;">
        <i class="fas fa-check-circle" style="font-size:3rem; color:var(--success-green); margin-bottom:1rem;"></i>
        <p style="color:var(--text-secondary);">No reports pending police verification.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="background:#e3f2fd; padding:1rem; border-radius:8px; margin-bottom:1.5rem; border-left:4px solid var(--primary-blue);">
      <strong><i class="fas fa-info-circle"></i> Verification Required:</strong>
      <p style="margin:0.5rem 0 0; font-size:0.9rem;">Please physically confirm the missing person has been found and enter the official OB (Occurrence Book) Number from your police station.</p>
    </div>
  ` + data.map((post) => `
    <div class="admin-row" style="background:white;">
      <div class="admin-row-info">
        <img src="${post.photo_url || placeholderAvatar(post.first_name)}" class="admin-row-photo" onerror="this.src='${placeholderAvatar(post.first_name)}'">
        <div>
          <strong style="font-size:1.1rem;">${escapeHtml(post.first_name)} ${escapeHtml(post.last_name)}</strong>
          <p style="font-size:0.85rem; color:var(--text-secondary);">
            <i class="fas fa-user"></i> Reported by: ${escapeHtml(post.profiles?.first_name || 'Unknown')} 
            ${post.profiles?.phone ? `(${escapeHtml(post.profiles.phone)})` : ''}
          </p>
          <p style="font-size:0.85rem; color:var(--primary-blue); margin-top:0.25rem;">
            <i class="fas fa-map-marker-alt"></i> ${escapeHtml(post.last_location)}
          </p>
          <div style="background:#f8f9fa; padding:0.75rem; border-radius:6px; margin-top:0.5rem;">
            <strong style="font-size:0.85rem;">Reason Found:</strong>
            <p style="margin:0.25rem 0 0; font-size:0.85rem; font-style:italic;">"${escapeHtml(post.resolution_note || 'Not provided')}"</p>
          </div>
        </div>
      </div>
      <div class="admin-row-actions" style="flex-direction:column; gap:0.5rem; align-items:flex-end;">
        <input type="text" id="ob-input-${post.id}" placeholder="OB Number" 
          style="padding:8px; border:2px solid var(--border-gray); border-radius:6px; width:140px; font-weight:600;">
        <button class="btn-primary" style="padding:10px 16px; width:100%;" onclick="verifyAsPolice('${post.id}')">
          <i class="fas fa-shield-alt"></i> Verify & Mark Found
        </button>
      </div>
    </div>
  `).join("");
}

// NEW: Police Verification Action
async function verifyAsPolice(postId) {
  const obNumber = document.getElementById(`ob-input-${postId}`).value.trim();
  if (!obNumber) {
    showToast("Please enter the Police OB Number.", "warning");
    return;
  }

  // Marks as verified, but keeps status as 'found_pending' for Admin to approve
  const { error } = await supabaseClient
    .from("missing_persons")
    .update({ 
      police_verified: true, 
      police_ob_number: obNumber,
      updated_at: new Date().toISOString()
    })
    .eq("id", postId);

  if (error) {
    showToast("Verification failed.", "error");
  } else {
    showToast("✅ Verified! Report sent to Admin for final approval.", "success");
    loadPoliceQueue();
  }
}

async function markAsFoundApproved(postId) {
  if (!confirm("Approve this resolution? It will become publicly visible as Found.")) return;
  const { error } = await supabaseClient.from("missing_persons").update({ status: "found" }).eq("id", postId);
  if (error) { showToast(error.message, "error"); return; }

  await logAdminAction("approve_resolution", "missing_persons", postId, "Approved found_pending report");
  showToast("Approved. The report is now public as Found.", "success");
  await loadFeed();
  await loadAdminData();
}

async function rejectResolution(postId, previousStatus) {
  if (!confirm("Reject this resolution and return the report to active status?")) return;
  const { error } = await supabaseClient
    .from("missing_persons")
    .update({ status: previousStatus || "missing" })
    .eq("id", postId);
  if (error) { showToast(error.message, "error"); return; }

  await logAdminAction("reject_resolution", "missing_persons", postId, "Returned report to active status");
  showToast("Rejected. The reporter has been notified.", "info");
  await loadFeed();
  await loadAdminData();
}

async function deletePost(postId) {
  if (!confirm("Delete this report permanently? This cannot be undone.")) return;
  const { error } = await supabaseClient.from("missing_persons").delete().eq("id", postId);
  if (error) { showToast(error.message, "error"); return; }

  if (currentProfile.role === "admin") {
    await logAdminAction("delete_report", "missing_persons", postId, "Deleted a report");
  }
  showToast("Report deleted.", "info");
  await loadFeed();
  if (document.getElementById("mine-tab").classList.contains("active")) await loadMyPosts();
  if (document.getElementById("admin-tab").classList.contains("active")) await loadAdminData();
}

// ==========================================
// Share & Print
// ==========================================
async function sharePost(postId) {
  const post = allPosts.find((p) => p.id === postId);
  if (!post) return;

  const shareUrl = `${window.location.origin}${window.location.pathname}?report=${postId}`;
  const shareText = `Help find ${post.first_name} ${post.last_name}, last seen at ${post.last_location}. Contact: ${post.contact_phone}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: "Help Find a Missing Person - FindMe", text: shareText, url: shareUrl });
      updateShareCount(postId);
      return;
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Share failed', err);
      else return;
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    showToast("Link copied to clipboard! You can now paste it anywhere.", "success");
    updateShareCount(postId);
  } catch (err) {
    const textArea = document.createElement("textarea");
    textArea.value = shareUrl;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    showToast("Link copied to clipboard!", "success");
    updateShareCount(postId);
  }
}

async function updateShareCount(postId) {
  const current = allPosts.find((p) => p.id === postId);
  const newCount = (current?.share_count || 0) + 1;
  if (current) current.share_count = newCount;
  renderFeed();
  await supabaseClient.from("missing_persons").update({ share_count: newCount }).eq("id", postId);
}

function callFamily(number) { if (confirm(`Call ${number}?`)) window.location.href = `tel:${number}`; }
function callEmergency(number) { if (confirm(`Call ${number}?`)) window.location.href = `tel:${number}`; }

function printFlyer(postId) {
  const post = allPosts.find((p) => p.id === postId) || null;
  if (!post) return;

  const win = window.open("", "_blank", "width=800,height=1000");
  const photo = post.photo_url || placeholderAvatar(post.first_name);
  
  const isFound = post.status === "found" || post.status === "found_pending";
  const statusText = isFound ? "FOUND" : "MISSING";
  const statusColor = isFound ? "#42b883" : "#e74c3c";
  const headline = isFound ? "FOUND SAFE" : "MISSING";

  win.document.write(`
    <html>
    <head>
      <title>${statusText} Person Flyer - ${escapeHtml(post.first_name)} ${escapeHtml(post.last_name)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; text-align: center; color: #1c1e21; }
        h1 { color: ${statusColor}; font-size: 48px; margin-bottom: 4px; font-weight: 900; letter-spacing: 2px; }
        h2 { font-size: 28px; margin-top: 0; }
        img { width: 280px; height: 360px; object-fit: cover; border: 4px solid #1c1e21; margin: 20px 0; }
        .details { text-align: left; max-width: 500px; margin: 20px auto; font-size: 16px; line-height: 1.8; }
        .details strong { display: inline-block; width: 150px; }
        .contact { background: #1c1e21; color: white; padding: 16px; margin-top: 20px; font-size: 18px; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 12px; color: #65676b; }
        .status-badge { display: inline-block; background: ${statusColor}; color: white; padding: 8px 24px; border-radius: 8px; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="status-badge">${statusText}</div>
      <h1>${headline}</h1>
      <h2>${escapeHtml(post.first_name)} ${escapeHtml(post.last_name)}</h2>
      <img src="${photo}" alt="Person photo">
      <div class="details">
        <p><strong>Age:</strong> ${post.age} years old</p>
        <p><strong>Gender:</strong> ${escapeHtml(post.gender)}</p>
        <p><strong>Last Seen:</strong> ${escapeHtml(post.last_location)}${post.county ? ", " + escapeHtml(post.county) : ""}</p>
        <p><strong>Date/Time:</strong> ${new Date(post.last_seen_at).toLocaleString()}</p>
        <p><strong>Description:</strong> ${escapeHtml(post.description)}</p>
        ${isFound && post.resolution_note ? `<p><strong>Resolution:</strong> ${escapeHtml(post.resolution_note)}</p>` : ""}
        ${post.police_verified && post.police_ob_number ? `<p><strong>Police Verified:</strong> OB #${escapeHtml(post.police_ob_number)}</p>` : ""}
      </div>
      <div class="contact">If you have any information, please call ${escapeHtml(post.contact_phone)}</div>
      <div class="footer">Reported via FindMe · Please contact the police if this is urgent (999 / 911)</div>
      <script>window.onload = () => window.print();<\/script>
    </body>
    </html>
  `);
  win.document.close();
}

// ==========================================
// Tips & Notifications
// ==========================================
function showTipModal(postId) {
  activeTipPostId = postId;
  document.getElementById("tip-modal").classList.remove("hidden");
}
function hideTipModal() {
  activeTipPostId = null;
  document.getElementById("tip-modal").classList.add("hidden");
  document.getElementById("tip-form").reset();
}

async function handleTipSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    missing_person_id: activeTipPostId,
    tipper_id: currentProfile.id,
    message: formData.get("message").trim(),
    contact_phone: formData.get("contactPhone")?.trim() || null,
    is_anonymous: formData.get("anonymous") === "on",
  };

  const { error } = await supabaseClient.from("tips").insert(payload);
  if (error) { showToast(error.message, "error"); return; }

  hideTipModal();
  showToast("Thank you. Your tip has been sent to the reporter.", "success");
}

async function viewTips(postId) {
  const { data, error } = await supabaseClient
    .from("tips")
    .select("*, profiles:tipper_id(first_name, last_name)")
    .eq("missing_person_id", postId)
    .order("created_at", { ascending: false });

  if (error) { showToast(error.message, "error"); return; }

  const rows = (data || []).map((t) => {
    const who = t.is_anonymous ? "Anonymous" : (t.profiles ? `${t.profiles.first_name} ${t.profiles.last_name}` : "FindMe user");
    return `
      <div class="admin-note-box" style="margin-bottom:0.75rem;">
        <p style="margin-bottom:0.25rem;"><strong>${escapeHtml(who)}</strong> — ${formatTimeAgo(new Date(t.created_at))}</p>
        <p style="margin-bottom:0.25rem;">${escapeHtml(t.message)}</p>
        ${t.contact_phone ? `<p style="color:var(--text-secondary);font-size:0.9rem;">Contact: ${escapeHtml(t.contact_phone)}</p>` : ""}
      </div>
    `;
  }).join("");

  const html = `
    <div class="settings-section" style="border:none;">
      ${rows || "<p style='color:var(--text-secondary);'>No tips submitted yet.</p>"}
    </div>
    <div class="form-actions"><button class="btn-primary" onclick="hideSettingsModal()">Close</button></div>
  `;
  showSettingsModal("Tips Received", html);
}

async function refreshNotificationBadge() {
  const { count, error } = await supabaseClient
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", currentProfile.id)
    .eq("is_read", false);

  if (error) return;
  const badge = document.getElementById("notification-badge");
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

async function loadNotifications() {
  const container = document.getElementById("notifications-list");
  const emptyEl = document.getElementById("notifications-empty");
  container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:1rem;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';

  const { data, error } = await supabaseClient
    .from("notifications")
    .select("*")
    .eq("user_id", currentProfile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) { showToast(error.message, "error"); return; }
  if (!data || data.length === 0) {
    container.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");

  container.innerHTML = data.map((n) => `
    <div class="notification-item ${n.is_read ? "" : "unread"}" data-id="${n.id}">
      <div class="notification-content">
        <p><strong>${escapeHtml(n.title)}</strong> — ${escapeHtml(n.message)}</p>
        <span class="notification-time">${formatTimeAgo(new Date(n.created_at))}</span>
      </div>
      ${!n.is_read ? `<button class="btn-secondary" onclick="markNotificationRead('${n.id}')">Mark Read</button>` : ""}
    </div>
  `).join("");
}

async function markNotificationRead(id) {
  await supabaseClient.from("notifications").update({ is_read: true }).eq("id", id);
  await loadNotifications();
  await refreshNotificationBadge();
}

async function markAllNotificationsRead() {
  await supabaseClient.from("notifications").update({ is_read: true }).eq("user_id", currentProfile.id).eq("is_read", false);
  showToast("All notifications marked as read.", "success");
  await loadNotifications();
  await refreshNotificationBadge();
}

// ==========================================
// Profile Settings
// ==========================================
function showProfileSettings() {
  toggleHamburgerMenu();
  const avatarUrl = currentProfile.avatar_url || placeholderAvatar(`${currentProfile.first_name} ${currentProfile.last_name}`);

  const content = `
    <div class="profile-settings-container" style="padding: 1.5rem;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <div class="profile-photo-upload-container">
          <img src="${avatarUrl}" alt="Profile" id="profile-preview-image" class="profile-photo-preview" onerror="this.src='${placeholderAvatar("User")}'">
          <label for="profile-photo-upload" class="profile-photo-btn" title="Change Photo">
            <i class="fas fa-camera"></i>
          </label>
          <input type="file" id="profile-photo-upload" accept="image/*" style="display: none;" onchange="handleProfilePhotoSelect(event)">
        </div>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">Click the camera icon to change your profile picture</p>
      </div>

      <div class="settings-section" style="border:none; padding:0;">
        <div class="form-group"><label>First Name</label><input type="text" id="settings-first-name" value="${escapeAttr(currentProfile.first_name)}"></div>
        <div class="form-group"><label>Last Name</label><input type="text" id="settings-last-name" value="${escapeAttr(currentProfile.last_name)}"></div>
        <div class="form-group"><label>Phone Number</label><input type="tel" id="settings-phone" value="${escapeAttr(currentProfile.phone || "")}"></div>
        <div class="form-group"><label>County</label><input type="text" id="settings-county" value="${escapeAttr(currentProfile.county || "")}" placeholder="e.g., Nairobi"></div>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" value="${escapeAttr(currentProfile.email)}" disabled style="background: var(--light-gray); cursor: not-allowed;">
          <small style="color: var(--text-secondary);">Email cannot be changed</small>
        </div>
      </div>

      <div class="form-actions">
        <button class="btn-secondary" onclick="hideSettingsModal()">Cancel</button>
        <button class="btn-primary" onclick="saveProfileSettings(event)"><i class="fas fa-save"></i> Save Changes</button>
      </div>
    </div>
  `;
  showSettingsModal("Profile Settings", content);
}

function handleProfilePhotoSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { showToast("Please select a valid image file", "error"); return; }
  if (file.size > 5 * 1024 * 1024) { showToast("Image size must be less than 5MB", "error"); return; }

  uploadedProfilePhotoFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("profile-preview-image").src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeProfilePhoto() {
  uploadedProfilePhotoFile = null;
  const input = document.getElementById("profile-photo-upload");
  if (input) input.value = "";
  const avatarUrl = currentProfile.avatar_url || placeholderAvatar(`${currentProfile.first_name} ${currentProfile.last_name}`);
  document.getElementById("profile-preview-image").src = avatarUrl;
}

async function saveProfileSettings(event) {
  const firstName = document.getElementById("settings-first-name").value.trim();
  const lastName = document.getElementById("settings-last-name").value.trim();
  const phone = document.getElementById("settings-phone").value.trim();
  const county = document.getElementById("settings-county").value.trim();
  const submitBtn = event.target;

  let avatarUrl = currentProfile.avatar_url;

  if (uploadedProfilePhotoFile) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
      const fileExt = uploadedProfilePhotoFile.name.split(".").pop();
      const filePath = `${currentProfile.id}/profile/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabaseClient.storage.from("profile-photos").upload(filePath, uploadedProfilePhotoFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseClient.storage.from("profile-photos").getPublicUrl(filePath);
      avatarUrl = publicUrlData.publicUrl;
    } catch (error) {
      showToast("Failed to upload photo: " + error.message, "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
      return;
    }
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
  }

  const { error } = await supabaseClient
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName, phone, county, avatar_url: avatarUrl })
    .eq("id", currentProfile.id);

  if (error) { showToast(error.message, "error"); return; }

  currentProfile.first_name = firstName;
  currentProfile.last_name = lastName;
  currentProfile.phone = phone;
  currentProfile.county = county;
  currentProfile.avatar_url = avatarUrl;

  uploadedProfilePhotoFile = null;
  hideSettingsModal();
  showToast("Profile updated successfully!", "success");
  initDashboard();
}

// ==========================================
// Static Info Pages
// ==========================================
function showAbout() {
  const html = `
 <div class="about-container" style="padding: 2rem;">
  <div class="founder-section" style="text-align: center; margin-bottom: 3rem;">
    <div style="width: 200px; height: 200px; margin: 0 auto 1.5rem; border-radius: 50%; overflow: hidden; border: 5px solid var(--primary-blue); box-shadow: var(--shadow-large);">
      <img src="public/brian.jpeg" alt="Brian Njuguna - Founder" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=Brian+Njuguna'">
    </div>
    <h2 style="font-size: 2rem; margin-bottom: 0.5rem; color: var(--text-primary);">Brian Njuguna</h2>
    <p style="color: var(--primary-blue); font-weight: 600; font-size: 1.1rem; margin-bottom: 1rem;">Founder & CEO</p>
  </div>
  
  <div class="founding-story" style="background: var(--light-gray); padding: 2rem; border-radius: 16px; margin-bottom: 2rem;">
    <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-size: 1.5rem;">Our Founding Story</h3>
    <p style="line-height: 1.8; color: var(--text-secondary); margin-bottom: 1rem;">
      FindMe wasn’t born in a boardroom; it was born out of sheer helplessness and a refusal to accept the status quo. In 2024, I watched a neighboring family in Nairobi endure every parent’s worst nightmare: their child went missing. For three agonizing days, the community rallied, but the chaos of the search was heartbreaking.
    </p>
    <p style="line-height: 1.8; color: var(--text-secondary); margin-bottom: 1rem;">
      I watched well-meaning neighbors share grainy, outdated photos on WhatsApp groups that quickly got buried under other messages. I saw physical flyers tearing in the rain, and I heard the devastating silence when unverified leads turned out to be false. I remember thinking: <em>"In an age where we can track a parcel across the country in real-time, why is finding a missing loved one still this chaotic? Every single minute counts."</em>
    </p>
    <p style="line-height: 1.8; color: var(--text-secondary); margin-bottom: 1rem;">
      That frustration sparked an idea, and I couldn't just stand by. I started building a prototype just a simple, centralized platform where reports could be instantly shared, tips could be securely submitted, and the community could act as one coordinated force. 
    </p>
    <p style="line-height: 1.8; color: var(--text-secondary);">
      What started as a desperate attempt to help one family has now grown into a nationwide movement. Today, FindMe has helped reunite countless families across Kenya. My vision remains as raw and urgent as day one: no family should have to face the trauma of a missing loved one alone. With the right technology and the unmatched spirit of the Kenyan community, we can, and we will, bring people home.
    </p>
  </div>

  <div class="mission-values" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
    <div class="value-card" style="background: white; padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--primary-blue); box-shadow: var(--shadow);">
      <i class="fas fa-heart" style="font-size: 2rem; color: var(--primary-blue); margin-bottom: 1rem;"></i>
      <h4 style="margin-bottom: 0.5rem;">Our Mission</h4>
      <p style="color: var(--text-secondary); font-size: 0.95rem;">To reunite families with missing loved ones through the power of community and technology.</p>
    </div>
    <div class="value-card" style="background: white; padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--success-green); box-shadow: var(--shadow);">
      <i class="fas fa-shield-alt" style="font-size: 2rem; color: var(--success-green); margin-bottom: 1rem;"></i>
      <h4 style="margin-bottom: 0.5rem;">Our Promise</h4>
      <p style="color: var(--text-secondary); font-size: 0.95rem;">Every report is verified, every tip is taken seriously, and every family deserves our unwavering support.</p>
    </div>
    <div class="value-card" style="background: white; padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--warning-orange); box-shadow: var(--shadow);">
      <i class="fas fa-users" style="font-size: 2rem; color: var(--warning-orange); margin-bottom: 1rem;"></i>
      <h4 style="margin-bottom: 0.5rem;">Our Community</h4>
      <p style="color: var(--text-secondary); font-size: 0.95rem;">Thousands of active members across Kenya, ready to help bring missing persons home.</p>
    </div>
  </div>
</div>
  `;
  showSettingsModal("About FindMe", html);
  toggleHamburgerMenu();
}

function showContactInfo() {
  const html = `
    <div class="contact-container" style="padding: 2rem;">
      <div class="contact-header" style="text-align: center; margin-bottom: 2.5rem;">
        <h2 style="font-size: 2rem; color: var(--text-primary); margin-bottom: 0.5rem;">Get in Touch</h2>
        <p style="color: var(--text-secondary);">We're here to help you 24/7</p>
      </div>

      <div class="founder-contact" style="background: linear-gradient(135deg, rgba(24,119,242,0.1) 0%, rgba(102,126,234,0.1) 100%); padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 2px solid var(--primary-blue);">
        <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">
          <div style="width: 100px; height: 100px; border-radius: 50%; overflow: hidden; border: 3px solid white; box-shadow: var(--shadow);">
            <img src="brian.jpeg" alt="Brian Njuguna" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=Brian+Njuguna'">
          </div>
          <div style="flex: 1; min-width: 250px;">
            <h3 style="color: var(--primary-blue); margin-bottom: 0.5rem;">Brian Njuguna</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">Founder & CEO</p>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <a href="tel:0717433252" style="display: flex; align-items: center; gap: 0.75rem; color: var(--text-primary); text-decoration: none; font-weight: 600; font-size: 1.2rem;">
                <i class="fas fa-phone" style="color: var(--success-green);"></i>
                0717 433 252
              </a>
              <a href="mailto:founder@findme.co.ke" style="display: flex; align-items: center; gap: 0.75rem; color: var(--text-primary); text-decoration: none;">
                <i class="fas fa-envelope" style="color: var(--primary-blue);"></i>
                founder@findme.co.ke
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="contact-methods" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
        <div class="contact-card" style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: var(--shadow); text-align: center;">
          <i class="fas fa-phone-alt" style="font-size: 2.5rem; color: var(--primary-blue); margin-bottom: 1rem;"></i>
          <h4 style="margin-bottom: 0.5rem;">Phone</h4>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">Mon-Fri, 8am-6pm EAT</p>
          <a href="tel:0717433252" class="btn-primary btn-full">0717 433 252</a>
        </div>
        <div class="contact-card" style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: var(--shadow); text-align: center;">
          <i class="fas fa-envelope" style="font-size: 2.5rem; color: var(--success-green); margin-bottom: 1rem;"></i>
          <h4 style="margin-bottom: 0.5rem;">Email</h4>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">We respond within 24 hours</p>
          <a href="mailto:support@findme.co.ke" class="btn-secondary btn-full">support@findme.co.ke</a>
        </div>
        <div class="contact-card" style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: var(--shadow); text-align: center;">
          <i class="fas fa-map-marker-alt" style="font-size: 2.5rem; color: var(--warning-orange); margin-bottom: 1rem;"></i>
          <h4 style="margin-bottom: 0.5rem;">Office</h4>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">Nairobi, Kenya</p>
          <p style="font-size: 0.9rem;">Kilimani, Nairobi County</p>
        </div>
      </div>

      <div class="emergency-banner" style="background: linear-gradient(135deg, var(--error-red), #c0392b); color: white; padding: 1.5rem; border-radius: 12px; text-align: center; margin-bottom: 2rem;">
        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
        <h3 style="margin-bottom: 0.5rem;">Emergency?</h3>
        <p style="margin-bottom: 1rem;">If this is an emergency, please contact the police immediately</p>
        <a href="tel:999" class="btn-primary" style="background: white; color: var(--error-red);"><i class="fas fa-phone"></i> Call 999 / 911</a>
      </div>
    </div>
  `;
  showSettingsModal("Contact Us", html);
}

function showHelpSupport() {
  const html = `
    <div class="help-container" style="padding: 2rem; max-height: 70vh; overflow-y: auto;">
      <div class="help-header" style="text-align: center; margin-bottom: 2rem;">
        <h2 style="font-size: 2rem; color: var(--text-primary); margin-bottom: 0.5rem;">Help Center</h2>
        <p style="color: var(--text-secondary);">Find answers to common questions</p>
      </div>

      <div class="faq-section" style="margin-bottom: 2rem;">
        <div class="faq-item" style="margin-bottom: 1.5rem; padding: 1.5rem; background: white; border-radius: 12px; box-shadow: var(--shadow);">
          <h5 style="color: var(--text-primary); margin-bottom: 0.75rem; font-size: 1.1rem;"><i class="fas fa-user-plus" style="color: var(--primary-blue); margin-right: 0.5rem;"></i> How do I report a missing person?</h5>
          <p style="color: var(--text-secondary); line-height: 1.7; margin-left: 1.75rem;">Sign in, click "Report Missing Person", fill in the details, and confirm the small KES 50 M-Pesa fee to publish the report and prevent spam.</p>
        </div>
        <div class="faq-item" style="margin-bottom: 1.5rem; padding: 1.5rem; background: white; border-radius: 12px; box-shadow: var(--shadow);">
          <h5 style="color: var(--text-primary); margin-bottom: 0.75rem; font-size: 1.1rem;"><i class="fas fa-check-circle" style="color: var(--success-green); margin-right: 0.5rem;"></i> How do I mark someone as found?</h5>
          <p style="color: var(--text-secondary); line-height: 1.7; margin-left: 1.75rem;">Go to "My Reports", select the case, and click "Mark as Found". Provide details about how they were found. A Police Officer will verify this physically before the Admin updates the status publicly.</p>
        </div>
        <div class="faq-item" style="margin-bottom: 1.5rem; padding: 1.5rem; background: white; border-radius: 12px; box-shadow: var(--shadow);">
          <h5 style="color: var(--text-primary); margin-bottom: 0.75rem; font-size: 1.1rem;"><i class="fas fa-comment-dots" style="color: var(--warning-orange); margin-right: 0.5rem;"></i> How can I provide a tip?</h5>
          <p style="color: var(--text-secondary); line-height: 1.7; margin-left: 1.75rem;">Browse the feed, click "Provide Tip" on any report. You can choose to remain anonymous or provide your contact details. All tips are sent directly to the reporter.</p>
        </div>
      </div>

      <div class="emergency-section" style="background: linear-gradient(135deg, rgba(231,76,60,0.1), rgba(192,57,43,0.1)); padding: 2rem; border-radius: 16px; border-left: 5px solid var(--error-red); margin-bottom: 2rem;">
        <h3 style="color: var(--error-red); margin-bottom: 1rem; font-size: 1.3rem;"><i class="fas fa-exclamation-triangle"></i> Emergency Contacts</h3>
        <div style="display: grid; gap: 1rem;">
          <div class="emergency-item" style="background: white; padding: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div><strong style="color: var(--text-primary);">Police Emergency</strong><p style="color: var(--text-secondary); font-size: 0.9rem;">Available 24/7</p></div>
            <a href="tel:999" class="btn-primary"><i class="fas fa-phone"></i> 999 / 911</a>
          </div>
          <div class="emergency-item" style="background: white; padding: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div><strong style="color: var(--text-primary);">Child Helpline</strong><p style="color: var(--text-secondary); font-size: 0.9rem;">For missing children</p></div>
            <a href="tel:116" class="btn-primary"><i class="fas fa-phone"></i> 116</a>
          </div>
        </div>
      </div>

      <div class="still-need-help" style="background: var(--gradient-primary); color: white; padding: 2rem; border-radius: 16px; text-align: center;">
        <h3 style="margin-bottom: 1rem;">Still Need Help?</h3>
        <button class="btn-primary" onclick="hideSettingsModal(); showContactInfo();" style="background: white; color: var(--primary-blue);"><i class="fas fa-envelope"></i> Contact Support</button>
      </div>
    </div>
  `;
  showSettingsModal("Help & Support", html);
  toggleHamburgerMenu();
}

function showTerms() {
  const html = `
    <div class="terms-container" style="padding: 2rem; max-height: 70vh; overflow-y: auto;">
      <h2 style="font-size: 2rem; color: var(--text-primary); margin-bottom: 0.5rem; text-align: center;">Terms of Service</h2>
      <p style="color: var(--text-secondary); text-align: center; margin-bottom: 2rem;">Last Updated: January 2026</p>

      <div class="terms-section" style="margin-bottom: 2rem;">
        <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-size: 1.2rem;">1. Acceptance of Terms</h3>
        <p style="color: var(--text-secondary); line-height: 1.7;">By accessing and using FindMe, you accept and agree to be bound by these terms. If you do not agree, please do not use this service.</p>
      </div>
      <div class="terms-section" style="margin-bottom: 2rem;">
        <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-size: 1.2rem;">2. Use of Service</h3>
        <p style="color: var(--text-secondary); line-height: 1.7; margin-bottom: 1rem;">FindMe is dedicated to helping reunite families with missing loved ones. You agree to use this platform only for its intended purpose and to provide accurate, truthful information.</p>
        <ul style="color: var(--text-secondary); line-height: 1.8; margin-left: 1.5rem;">
          <li>You must be at least 18 years old to create an account.</li>
          <li>You agree to provide accurate contact information.</li>
          <li>You are responsible for maintaining the confidentiality of your account.</li>
        </ul>
      </div>
      <div class="terms-section" style="margin-bottom: 2rem;">
        <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-size: 1.2rem;">3. Prohibited Conduct</h3>
        <p style="color: var(--text-secondary); line-height: 1.7; margin-bottom: 1rem;">You agree NOT to:</p>
        <ul style="color: var(--text-secondary); line-height: 1.8; margin-left: 1.5rem;">
          <li>Post false or misleading missing person reports.</li>
          <li>Use the platform for harassment, stalking, or intimidation.</li>
          <li>Submit fraudulent tips.</li>
          <li>Violate any laws or infringe on intellectual property rights.</li>
        </ul>
      </div>
      <div class="terms-section" style="margin-bottom: 2rem;">
        <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-size: 1.2rem;">4. Disclaimer of Warranties</h3>
        <p style="color: var(--text-secondary); line-height: 1.7;">FindMe is provided "as is". While we strive to help reunite families, we cannot guarantee that missing persons will be found, the accuracy of user-submitted information, or uninterrupted service.</p>
      </div>
      <div class="terms-section" style="margin-bottom: 2rem;">
        <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-size: 1.2rem;">5. Contact Information</h3>
        <div style="background: var(--light-gray); padding: 1rem; border-radius: 8px;">
          <p style="margin: 0.5rem 0;"><strong>Brian Njuguna</strong></p>
          <p style="margin: 0.5rem 0;">Founder, FindMe</p>
          <p style="margin: 0.5rem 0;">Phone: 0717 433 252</p>
          <p style="margin: 0.5rem 0;">Email: legal@findme.co.ke</p>
        </div>
      </div>
    </div>
  `;
  showSettingsModal("Terms of Service", html);
}

function showPrivacy() {
  const html = `
    <div class="privacy-container" style="padding: 2rem; max-height: 70vh; overflow-y: auto;">
      <h2 style="font-size: 2rem; color: var(--text-primary); margin-bottom: 0.5rem; text-align: center;">Privacy Policy</h2>
      <p style="color: var(--text-secondary); text-align: center; margin-bottom: 2rem;">Last Updated: January 2026</p>

      <div class="privacy-section" style="margin-bottom: 2rem;">
        <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-size: 1.2rem;">1. Information We Collect</h3>
        <ul style="color: var(--text-secondary); line-height: 1.8; margin-left: 1.5rem;">
          <li><strong>Account Information:</strong> Name, email address, phone number, county/location.</li>
          <li><strong>Missing Person Reports:</strong> Photos, descriptions, last known locations, contact information.</li>
          <li><strong>Usage Data:</strong> How you interact with the platform.</li>
        </ul>
      </div>
      <div class="privacy-section" style="margin-bottom: 2rem;">
        <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-size: 1.2rem;">2. How We Use Your Information</h3>
        <p style="color: var(--text-secondary); line-height: 1.7;">We use the information to operate FindMe, connect you with community members, send notifications, verify reports, and comply with legal obligations.</p>
      </div>
      <div class="privacy-section" style="margin-bottom: 2rem;">
        <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-size: 1.2rem;">3. Information Sharing</h3>
        <p style="color: var(--text-secondary); line-height: 1.7; margin-bottom: 1rem;">Missing person reports, including photos and contact details, are publicly visible to help locate missing individuals. Tips submitted are shared only with the reporter. <strong>We do NOT sell your personal information to third parties.</strong></p>
      </div>
      <div class="privacy-section" style="margin-bottom: 2rem;">
        <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-size: 1.2rem;">4. Data Storage and Security</h3>
        <p style="color: var(--text-secondary); line-height: 1.7;">We use Supabase, a secure cloud database platform, implementing industry-standard security measures including encryption of data in transit and at rest.</p>
      </div>
      <div class="privacy-section" style="margin-bottom: 2rem;">
        <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-size: 1.2rem;">5. Your Rights</h3>
        <p style="color: var(--text-secondary); line-height: 1.7;">You have the right to access, correct, or request deletion of your personal data. Contact us at privacy@findme.co.ke to exercise these rights.</p>
      </div>
      <div class="privacy-section" style="margin-bottom: 2rem;">
        <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-size: 1.2rem;">6. Contact Us</h3>
        <div style="background: var(--light-gray); padding: 1rem; border-radius: 8px;">
          <p style="margin: 0.5rem 0;"><strong>Brian Njuguna</strong></p>
          <p style="margin: 0.5rem 0;">Data Protection Officer, FindMe</p>
          <p style="margin: 0.5rem 0;">Phone: 0717 433 252</p>
          <p style="margin: 0.5rem 0;">Email: privacy@findme.co.ke</p>
        </div>
      </div>
    </div>
  `;
  showSettingsModal("Privacy Policy", html);
}

// ==========================================
// Admin dashboard
// ==========================================
async function loadAdminData() {
  if (!currentProfile || currentProfile.role !== "admin") return;
  await Promise.all([loadAdminPending(), loadAdminReports(), loadAdminUsers(), loadAdminTestimonials(), loadAdminAuditLog(), loadAdminAnalytics()]);
}

async function loadAdminAnalytics() {
  const el = document.getElementById("admin-analytics");
  if (!el) return;

  const { data, error } = await supabaseClient.from("missing_persons").select("status");
  if (error || !data) return;

  const counts = { urgent: 0, missing: 0, found_pending: 0, found: 0 };
  data.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status]++; });

  const max = Math.max(1, ...Object.values(counts));
  const bars = [
    { key: "urgent", label: "Urgent", color: "#e74c3c" },
    { key: "missing", label: "Missing", color: "#ff6b35" },
    { key: "found_pending", label: "Pending", color: "#f1c40f" },
    { key: "found", label: "Found", color: "#42b883" },
  ];

  const barWidth = 90;
  const gap = 30;
  const chartHeight = 160;
  const svgWidth = bars.length * (barWidth + gap);

  const rects = bars.map((b, i) => {
    const value = counts[b.key];
    const h = Math.round((value / max) * chartHeight);
    const x = i * (barWidth + gap) + gap / 2;
    const y = chartHeight - h;
    return `
      <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-primary)">${value}</text>
      <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${b.color}" rx="6"></rect>
      <text x="${x + barWidth / 2}" y="${chartHeight + 22}" text-anchor="middle" font-size="12" fill="var(--text-secondary)">${b.label}</text>
    `;
  }).join("");

  el.innerHTML = `<svg viewBox="0 0 ${svgWidth} ${chartHeight + 36}" width="100%" height="220">${rects}</svg>`;
}

async function loadAdminPending() {
  const { data, error } = await supabaseClient
    .from("missing_persons")
    .select("*, profiles:reporter_id(first_name, last_name, email, avatar_url)")
    .eq("status", "found_pending")
    .order("updated_at", { ascending: false });

  if (error) return;
  document.getElementById("admin-pending-count").textContent = data.length;
  
  document.getElementById("admin-pending-table").innerHTML = data.map((r) => {
    const policeBadge = r.police_verified 
      ? `<span style="background:var(--success-green); color:white; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:700; margin-left:5px;"><i class="fas fa-shield-alt"></i> POLICE VERIFIED (OB: ${escapeHtml(r.police_ob_number || 'N/A')})</span>`
      : `<span style="background:var(--warning-orange); color:white; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:700; margin-left:5px;"><i class="fas fa-clock"></i> AWAITING POLICE</span>`;

    return `
    <div class="admin-row">
      <div class="admin-row-info">
        <img class="admin-row-photo" src="${r.photo_url || placeholderAvatar(r.first_name)}" alt="" onerror="this.src='${placeholderAvatar(r.first_name)}'">
        <div>
          <p><strong>${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}</strong> ${policeBadge}</p>
          <p style="font-size:0.85rem; color:var(--text-secondary);">Reported by: ${escapeHtml(r.profiles ? r.profiles.first_name + " " + r.profiles.last_name : "unknown")}</p>
          <span class="notification-time">${escapeHtml(r.last_location)} • ${formatTimeAgo(new Date(r.updated_at))}</span>
          ${r.resolution_note ? `<div class="admin-note-box"><strong>Reporter says:</strong> ${escapeHtml(r.resolution_note)}</div>` : ""}
        </div>
      </div>
      <div class="admin-row-actions">
        <button class="btn-primary" onclick="markAsFoundApproved('${r.id}')" ${!r.police_verified ? 'disabled style="opacity:0.5; cursor:not-allowed;" title="Police must verify first"' : ''}>
          ${r.police_verified ? 'Approve & Mark Found' : 'Waiting for Police'}
        </button>
        <button class="btn-secondary" onclick="rejectResolution('${r.id}', '${r.previous_status || "missing"}')">Reject</button>
      </div>
    </div>
  `}).join("") || "<p style='color:var(--text-secondary); padding: 1rem;'>Nothing waiting for review.</p>";
}

async function loadAdminReports() {
  const { data, error } = await supabaseClient
    .from("missing_persons")
    .select("*, profiles:reporter_id(first_name, last_name, email, avatar_url)")
    .order("created_at", { ascending: false });

  if (error) return;
  document.getElementById("admin-report-count").textContent = data.length;
  document.getElementById("admin-reports-table").innerHTML = data.map((r) => `
    <div class="admin-row">
      <div class="admin-row-info">
        <img class="admin-row-photo" src="${r.photo_url || placeholderAvatar(r.first_name)}" alt="" onerror="this.src='${placeholderAvatar(r.first_name)}'">
        <div>
          <p><strong>${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}</strong> — ${escapeHtml(r.status)} reported by ${escapeHtml(r.profiles ? r.profiles.first_name + " " + r.profiles.last_name : "unknown")}</p>
          <span class="notification-time">${formatTimeAgo(new Date(r.created_at))} • ${escapeHtml(r.last_location)}</span>
          ${r.police_verified && r.police_ob_number ? `<p style="margin-top:0.25rem; font-size:0.85rem; color:var(--success-green);"><i class="fas fa-file-alt"></i> OB: ${escapeHtml(r.police_ob_number)}</p>` : ''}
        </div>
      </div>
      <div class="admin-row-actions">
        ${r.status === "found_pending" ? `<button class="btn-primary" onclick="markAsFoundApproved('${r.id}')">Approve</button>` : ""}
        <button class="btn-secondary" style="background:var(--error-red);color:white;" onclick="deletePost('${r.id}')">Delete</button>
      </div>
    </div>
  `).join("") || "<p style='color:var(--text-secondary); padding: 1rem;'>No reports yet.</p>";
}

async function loadAdminUsers() {
  const { data, error } = await supabaseClient.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) return;
  document.getElementById("admin-user-count").textContent = data.length;
  document.getElementById("admin-users-table").innerHTML = data.map((u) => `
    <div class="admin-row">
      <div class="admin-row-info">
        <img class="admin-row-photo" src="${u.avatar_url || placeholderAvatar(u.first_name)}" alt="" onerror="this.src='${placeholderAvatar(u.first_name)}'">
        <div>
          <p><strong>${escapeHtml(u.first_name)} ${escapeHtml(u.last_name)}</strong> — ${escapeHtml(u.email)}</p>
          <span class="notification-time">${escapeHtml(u.county || "No county set")} • joined ${formatTimeAgo(new Date(u.created_at))}</span>
        </div>
      </div>
      <div class="admin-row-actions">
        ${u.id !== currentProfile.id ? `
          <button class="btn-secondary" onclick="toggleAdminRole('${u.id}', '${u.role}')">
            ${u.role === "admin" ? "Revoke Admin" : "Make Admin"}
          </button>` : `<span class="user-role-badge role-admin">YOU</span>`}
      </div>
    </div>
  `).join("") || "<p style='color:var(--text-secondary); padding: 1rem;'>No users yet.</p>";
}

async function toggleAdminRole(userId, currentRole) {
  const newRole = currentRole === "admin" ? "user" : "admin";
  if (!confirm(`Change this user's role to ${newRole}?`)) return;
  const { error } = await supabaseClient.from("profiles").update({ role: newRole }).eq("id", userId);
  if (error) { showToast(error.message, "error"); return; }
  await logAdminAction(newRole === "admin" ? "promote_to_admin" : "revoke_admin", "profiles", userId, `Role changed to ${newRole}`);
  showToast(`Role updated to ${newRole}.`, "success");
  await loadAdminData();
}

async function loadAdminTestimonials() {
  const { data, error } = await supabaseClient.from("testimonials").select("*").order("display_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) return;
  document.getElementById("admin-testimonials-table").innerHTML = data.map((t) => `
    <div class="admin-row">
      <div class="admin-row-info">
        <img class="admin-row-photo" src="${t.photo_url || placeholderAvatar(t.author_name)}" alt="" onerror="this.src='${placeholderAvatar(t.author_name)}'">
        <div>
          <p><strong>${escapeHtml(t.author_name)}</strong> ${t.is_approved ? '<span class="user-role-badge role-user">PUBLISHED</span>' : '<span class="user-role-badge role-admin">DRAFT</span>'}</p>
          <span class="notification-time">"${escapeHtml(t.quote)}" — ${escapeHtml(t.location || "")}</span>
        </div>
      </div>
      <div class="admin-row-actions">
        <button class="btn-secondary" onclick='editTestimonial(${JSON.stringify(t).replace(/'/g, "&apos;")})'>Edit</button>
        <button class="btn-secondary" onclick="toggleTestimonialApproval('${t.id}', ${t.is_approved})">${t.is_approved ? "Unpublish" : "Publish"}</button>
        <button class="btn-secondary" style="background:var(--error-red);color:white;" onclick="deleteTestimonial('${t.id}')">Delete</button>
      </div>
    </div>
  `).join("") || "<p style='color:var(--text-secondary); padding: 1rem;'>No testimonials yet.</p>";
}

function showTestimonialModal() {
  document.getElementById("testimonial-modal-title").textContent = "Add Testimonial";
  document.getElementById("testimonial-id").value = "";
  document.getElementById("testimonial-quote").value = "";
  document.getElementById("testimonial-author").value = "";
  document.getElementById("testimonial-location").value = "";
  document.getElementById("testimonial-photo").value = "";
  document.getElementById("testimonial-approved").checked = false;
  uploadedTestimonialPhotoFile = null;

  const preview = document.getElementById("testimonial-photo-preview");
  const label = document.getElementById("testimonial-upload-label");
  if (preview) preview.classList.add("hidden");
  if (label) label.classList.remove("hidden");

  document.getElementById("testimonial-modal").classList.remove("hidden");
}

function editTestimonial(t) {
  document.getElementById("testimonial-modal-title").textContent = "Edit Testimonial";
  document.getElementById("testimonial-id").value = t.id;
  document.getElementById("testimonial-quote").value = t.quote;
  document.getElementById("testimonial-author").value = t.author_name;
  document.getElementById("testimonial-location").value = t.location || "";
  document.getElementById("testimonial-photo").value = t.photo_url || "";
  document.getElementById("testimonial-approved").checked = !!t.is_approved;
  uploadedTestimonialPhotoFile = null;

  const preview = document.getElementById("testimonial-photo-preview");
  const label = document.getElementById("testimonial-upload-label");
  if (preview) preview.classList.add("hidden");
  if (label) label.classList.remove("hidden");

  document.getElementById("testimonial-modal").classList.remove("hidden");
}

function hideTestimonialModal() {
  document.getElementById("testimonial-modal").classList.add("hidden");
}

function handleTestimonialPhotoSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { showToast("Please select a valid image file", "error"); return; }
  if (file.size > 5 * 1024 * 1024) { showToast("Image size must be less than 5MB", "error"); return; }

  uploadedTestimonialPhotoFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("testimonial-upload-label").classList.add("hidden");
    document.getElementById("testimonial-photo-preview").classList.remove("hidden");
    document.getElementById("testimonial-preview-image").src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeTestimonialPhoto() {
  uploadedTestimonialPhotoFile = null;
  const input = document.getElementById("testimonial-photo-file");
  if (input) input.value = "";
  document.getElementById("testimonial-upload-label")?.classList.remove("hidden");
  document.getElementById("testimonial-photo-preview")?.classList.add("hidden");
}

async function handleTestimonialSubmit(event) {
  event.preventDefault();
  const submitBtn = event.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    const id = document.getElementById("testimonial-id").value;
    let photoUrl = document.getElementById("testimonial-photo").value.trim();

    if (uploadedTestimonialPhotoFile) {
      const fileExt = uploadedTestimonialPhotoFile.name.split(".").pop();
      const filePath = `testimonials/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabaseClient.storage.from("testimonial-photos").upload(filePath, uploadedTestimonialPhotoFile);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseClient.storage.from("testimonial-photos").getPublicUrl(filePath);
      photoUrl = publicUrlData.publicUrl;
    }

    const payload = {
      quote: document.getElementById("testimonial-quote").value.trim(),
      author_name: document.getElementById("testimonial-author").value.trim(),
      location: document.getElementById("testimonial-location").value.trim() || null,
      photo_url: photoUrl || null,
      is_approved: document.getElementById("testimonial-approved").checked,
    };

    let error;
    if (id) {
      ({ error } = await supabaseClient.from("testimonials").update(payload).eq("id", id));
    } else {
      payload.created_by = currentProfile.id;
      ({ error } = await supabaseClient.from("testimonials").insert(payload));
    }

    if (error) throw error;

    await logAdminAction(id ? "edit_testimonial" : "create_testimonial", "testimonials", id || null, payload.author_name);
    hideTestimonialModal();
    showToast("Testimonial saved successfully!", "success");
    await loadAdminTestimonials();
    uploadedTestimonialPhotoFile = null;
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Save Testimonial";
  }
}

async function toggleTestimonialApproval(id, isApproved) {
  const { error } = await supabaseClient.from("testimonials").update({ is_approved: !isApproved }).eq("id", id);
  if (error) { showToast(error.message, "error"); return; }
  await logAdminAction(!isApproved ? "publish_testimonial" : "unpublish_testimonial", "testimonials", id, "");
  showToast(!isApproved ? "Testimonial published to the landing page." : "Testimonial unpublished.", "success");
  await loadAdminTestimonials();
}

async function deleteTestimonial(id) {
  if (!confirm("Delete this testimonial?")) return;
  const { error } = await supabaseClient.from("testimonials").delete().eq("id", id);
  if (error) { showToast(error.message, "error"); return; }
  await logAdminAction("delete_testimonial", "testimonials", id, "");
  showToast("Testimonial deleted.", "info");
  await loadAdminTestimonials();
}

async function logAdminAction(action, targetType, targetId, details) {
  await supabaseClient.from("admin_actions").insert({
    admin_id: currentProfile.id,
    action,
    target_type: targetType,
    target_id: targetId || null,
    details: details || null,
  });
}

async function loadAdminAuditLog() {
  const { data, error } = await supabaseClient
    .from("admin_actions")
    .select("*, profiles:admin_id(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return;
  document.getElementById("admin-audit-log").innerHTML = data.map((a) => `
    <div class="audit-log-item">
      <span><strong>${escapeHtml(a.profiles ? a.profiles.first_name + " " + a.profiles.last_name : "Admin")}</strong> ${escapeHtml(a.action.replace(/_/g, " "))} on ${escapeHtml(a.target_type)} ${a.details ? `— ${escapeHtml(a.details)}` : ""}</span>
      <span style="color: var(--text-secondary);">${formatTimeAgo(new Date(a.created_at))}</span>
    </div>
  `).join("") || "<p style='color:var(--text-secondary); padding: 1rem;'>No admin actions logged yet.</p>";
}

// ==========================================
// Utilities
// ==========================================
function showSettingsModal(title, contentHtml) {
  document.getElementById("settings-title").textContent = title;
  document.getElementById("settings-content").innerHTML = contentHtml;
  document.getElementById("settings-modal").classList.remove("hidden");
}
function hideSettingsModal() {
  document.getElementById("settings-modal").classList.add("hidden");
}

function showToast(message, type = "info") {
  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">${icons[type] || "ℹ️"}</div>
      <div class="notification-text"><span class="notification-message">${escapeHtml(message)}</span></div>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  let container = document.getElementById("notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "notification-container";
    container.className = "notification-container";
    document.body.appendChild(container);
  }
  container.appendChild(notification);
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}
function escapeAttr(text) {
  return (text ?? "").replace(/"/g, "&quot;");
}

function formatTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function placeholderAvatar(seed) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed || "U")}`;
}