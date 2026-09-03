
async function getCurrentProfile() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) {
    console.error("Failed to load profile:", error.message);
    return null;
  }
  return data;
}


async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}


async function redirectIfAuthed() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    window.location.href = "index.html";
  }
}

async function signOutAndRedirect() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}