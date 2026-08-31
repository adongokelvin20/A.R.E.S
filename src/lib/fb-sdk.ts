/**
 * Facebook SDK loader for Meta Embedded Signup.
 *
 * Loads the Facebook JS SDK once, initializes it with the app ID, and
 * exposes a helper to launch the Embedded Signup login dialog.
 *
 * On mobile / non-SDK contexts, callers can fall back to the redirect-based
 * OAuth URL returned by /api/whatsapp/meta/embedded-signup.
 */

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

let loadPromise: Promise<any> | null = null;

export function loadFacebookSDK(appId: string): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("window not available"));
  if (window.FB) return Promise.resolve(window.FB);

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // Inject the SDK script
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";

    window.fbAsyncInit = () => {
      try {
        window.FB?.init({
          appId,
          cookie: true,
          xfbml: true,
          version: "v21.0",
        });
        resolve(window.FB);
      } catch (e) {
        reject(e);
      }
    };

    script.onerror = () => reject(new Error("Failed to load Facebook SDK"));
    document.head.appendChild(script);

    // Timeout safety — if the SDK doesn't init in 15s, reject
    setTimeout(() => {
      if (!window.FB) reject(new Error("Facebook SDK timed out"));
    }, 15000);
  });

  return loadPromise;
}

/**
 * Launch the Meta Embedded Signup dialog via FB.login.
 * Returns the authorization code on success.
 */
export function launchEmbeddedSignup(appId: string, configId: string): Promise<string> {
  return loadFacebookSDK(appId).then(
    (FB) =>
      new Promise<string>((resolve, reject) => {
        FB.login(
          (response: any) => {
            if (response.status === "connected" && response.authResponse?.code) {
              resolve(response.authResponse.code);
            } else if (response.status === "unknown") {
              reject(new Error("Signup cancelled or not completed."));
            } else {
              reject(new Error("Facebook did not return an authorization code."));
            }
          },
          {
            config_id: configId,
            response_type: "code",
            override_default_response_type: true,
            scope: "whatsapp_business_management,whatsapp_business_messaging",
          }
        );
      })
  );
}
