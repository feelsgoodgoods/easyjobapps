let userSignedIn = false;

chrome.runtime.onInstalled.addListener(details => { 
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        // Onboarding for new installs

        chrome.storage.sync.set({ newUserOnboarding: false }); // Set to false to indicate
        chrome.storage.sync.set({ firstLoginCompleted: false }); // Set to false so
        // first login welcome message is shown in options page
        
        chrome.storage.sync.set({ numberOfEmailsLocalState: 0 }); // Reset local record of num emails for account
        // Onboarding is not complete and needs to happen

        // chrome.tabs.create({
        //     url: "https://easyjobapps.com/chrome-installed",
        // });

        chrome.runtime.openOptionsPage();

        // Feedback for uninstalls.
        chrome.runtime.setUninstallURL('https://forms.gle/WYvSLBbU7jcp2VXu8');

    } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
        // Make sure existing users don't get the new user onboarding
        chrome.storage.sync.set({ newUserOnboarding: true }); // Set to true to indicate
        chrome.storage.sync.set({ numberOfEmailsLocalState: 1 }); // Set to 1 so confetti doesn't show
        chrome.storage.sync.set({ replyQuicklyOnboarding: true }); // Existing users don't see feature onboardings
        chrome.storage.sync.set({ rewriteFeatureOnboarding: true }); // Existing users don't see feature onboadings

        // Onboarding is complete

        // When extension is updated, check if this is a major update.
        chrome.storage.sync.get("addyUser", async function(data) {
            const userData = data.addyUser
            if (userData) {
                // user exists
                const userID = userData.uid;
            
                if (userID && userID != undefined) {
                    // Update Uninstall URL
                    chrome.runtime.setUninstallURL(`https://easyjobapps.com/chrome-uninstalled?src=${userID}`);
                
                    // chrome.tabs.create({
                    //     url: `https://easyjobapps.com/chrome-updated`,
                    // });
                } else {
                    // No user ID
                    // Update Uninstall URL
                    chrome.runtime.setUninstallURL("https://easyjobapps.com/chrome-uninstalled");
                    
                    // chrome.tabs.create({
                    //     url: "https://easyjobapps.com/chrome-updated",
                    // });
                }
            } else {
                // No user
                // Update Uninstall URL
                chrome.runtime.setUninstallURL("https://easyjobapps.com/chrome-uninstalled");
    
                // chrome.tabs.create({
                //     url: "https://easyjobapps.com/chrome-updated",
                // });
            }
        });
        
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.message) {
        case "is-user-signed-in":
            sendResponse({
                message: 'success',
                payload: userSignedIn
            });
            break;
        case "sign-out":
            userSignedIn = false;
            sendResponse({ message: "success" });
            break;
        case "sign-in":
            userSignedIn = true;
            sendResponse({ message: "success" });
            break;
        case "get-auth-token":
            // chrome.identity.getAuthToken({interactive: true}, function(token) {
            //     sendResponse({
            //         message: "success",
            //         token: token,
            //     });
            // });
            break;
        case "open-options":
            chrome.runtime.openOptionsPage();
            break;
        default:
            chrome.action.setPopup({popup: "./login.html"}, () => {
                sendResponse({message: "success"});
            });
            break;
    }
    return true;
})