export const fetchToken = async (
    url: string,
    data: Record<string, unknown>
) => {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Agora-Signature": "stridez@123456789",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    // Parse JSON response
    const jsonResp = await response.json();

    if (!response.ok) {
        console.log("response: An error occured fetching token ");
    } else {
        console.log("response: " + JSON.stringify(jsonResp.data));
        return jsonResp.data;
    }
};


export const agoraGetAppData = async (channel: string) => {
    const rtcUrl = `https://app.stridez.ca/api/v1/agora/rtcToken`;
    const rtmUrl = `https://app.stridez.ca/api/v1/agora/rtmToken`;
    const data = {
        channelName: channel,
        uid: generateUid(),
    };

    const [rtcOptions, rtmOptions] = await Promise.all([
        fetchToken(rtcUrl, data),
        fetchToken(rtmUrl, data),
    ]);

    console.log("promise result;", rtcOptions, rtmOptions);

    return { rtcOptions, rtmOptions };
};


export const generateUid = () => {
    const uid = Math.floor(Math.random() * 10000);
    return String(uid);
};