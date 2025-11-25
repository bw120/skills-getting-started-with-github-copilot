document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to show dismissable message
  function showMessage(text, type, container) {
    const msg = document.createElement("div");
    msg.className = `message ${type}`;
    msg.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span>${escapeHTML(text)}</span>
        <button type="button" style="background: none; border: none; cursor: pointer; font-size: 1.2em; color: inherit; padding: 0 0 0 10px;">&times;</button>
      </div>
    `;
    msg.classList.remove("hidden");
    
    const closeBtn = msg.querySelector("button");
    closeBtn.addEventListener("click", () => msg.remove());
    
    container.insertBefore(msg, container.firstChild);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (msg.parentElement) msg.remove();
    }, 5000);
  }

  // Helper to escape HTML to avoid XSS when rendering participant names
  function escapeHTML(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select to avoid duplicate options on re-fetch
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

          // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - (details.participants?.length || 0);

        const participants = Array.isArray(details.participants) ? details.participants : [];

        // Build participants HTML: bulleted list or fallback message
            // Build participants HTML: custom list with delete icon, no bullets
            let participantsHTML = "";
            if (participants.length > 0) {
              participantsHTML = `<div class="participants-list">${participants
                .map((p) => `
                  <span class="participant-item" style="display: flex; align-items: center; margin-bottom: 2px;">
                    <span style="flex: 1;">${escapeHTML(p)}</span>
                    <span class="delete-participant" title="Remove" data-activity="${escapeHTML(name)}" data-email="${escapeHTML(p)}" style="cursor:pointer;color:#c00;font-weight:bold;margin-left:8px;">&#128465;</span>
                  </span>`)
                .join("")}</div>`;
            } else {
              participantsHTML = `<p class="no-participants">No participants yet</p>`;
            }

        activityCard.innerHTML = `
          <h4>${escapeHTML(name)}</h4>
          <p>${escapeHTML(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHTML(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section">
            <strong>Participants (${participants.length}):</strong>
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
          // Add event listeners for delete icons
          document.querySelectorAll('.delete-participant').forEach((icon) => {
            icon.addEventListener('click', async (e) => {
              const activity = icon.getAttribute('data-activity');
              const email = icon.getAttribute('data-email');
              if (!activity || !email) return;
              if (!confirm(`Remove ${email} from ${activity}?`)) return;
              try {
                const response = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, {
                  method: 'POST',
                });
                if (response.ok) {
                  // Find the participants section and show message there
                  const activitySection = icon.closest('.activity-card');
                  const participantsSection = activitySection.querySelector('.participants-section');
                  showMessage(`Removed ${email} from ${activity}`, 'success', participantsSection);
                  // Delay fetchActivities to allow message to be read (aligns with 5s auto-dismiss)
                  setTimeout(() => {
                    fetchActivities();
                  }, 5000);
                } else {
                  const result = await response.json();
                  const activitySection = icon.closest('.activity-card');
                  const participantsSection = activitySection.querySelector('.participants-section');
                  showMessage(result.detail || 'Failed to remove participant.', 'error', participantsSection);
                }
              } catch (err) {
                const activitySection = icon.closest('.activity-card');
                const participantsSection = activitySection.querySelector('.participants-section');
                showMessage('Failed to remove participant.', 'error', participantsSection);
              }
            });
          });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, 'success', document.getElementById("signup-container"));
        signupForm.reset();
        // Refresh activities list to show the new participant immediately
        setTimeout(() => {
          fetchActivities();
        }, 500);
      } else {
        showMessage(result.detail || "An error occurred", 'error', document.getElementById("signup-container"));
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", 'error', document.getElementById("signup-container"));
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
