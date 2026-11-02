package com.biu.music;

import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Streams Bilibili media straight into the WebView's &lt;audio&gt; element.
 *
 * <p>The CDN rejects WebView/okhttp user agents with HTTP 403, and answers with
 * {@code application/octet-stream}, which Chromium's Opaque Response Blocking
 * refuses to feed to a media element. Downloading the whole file through the
 * native bridge (the previous approach) works around both problems but makes
 * the user wait for several megabytes before the first note plays.
 *
 * <p>Instead we intercept media requests, replay them upstream with a desktop
 * user agent and the required Referer, and hand the streaming response body
 * back to the WebView. Range requests are forwarded so seeking keeps working,
 * and nothing is buffered in memory.
 */
public class BiliMediaWebViewClient extends BridgeWebViewClient {

    private static final String DESKTOP_UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                    + "Chrome/141.0.0.0 Safari/537.36";

    /** Hosts that only serve media; anything else is left to Capacitor. */
    private static final String[] MEDIA_HOSTS = {
            "bilivideo.com", "bilivideo.cn", "bilivideo.net", "akamaized.net"
    };

    public BiliMediaWebViewClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        String url = request.getUrl().toString();
        if (isMediaHost(url)) {
            WebResourceResponse response = streamMedia(request, url);
            if (response != null) {
                return response;
            }
        }

        return super.shouldInterceptRequest(view, request);
    }

    private static boolean isMediaHost(String url) {
        String host = null;
        try {
            host = new URL(url).getHost();
        } catch (Exception ignored) {
            return false;
        }
        if (host == null) {
            return false;
        }

        host = host.toLowerCase(Locale.ROOT);
        for (String suffix : MEDIA_HOSTS) {
            if (host.equals(suffix) || host.endsWith("." + suffix)) {
                return true;
            }
        }

        return false;
    }

    private static String header(Map<String, String> headers, String name) {
        for (Map.Entry<String, String> entry : headers.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(name)) {
                return entry.getValue();
            }
        }

        return null;
    }

    private WebResourceResponse streamMedia(WebResourceRequest request, String url) {
        HttpURLConnection connection = null;

        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(20_000);
            connection.setRequestMethod("GET");
            connection.setRequestProperty("User-Agent", DESKTOP_UA);
            connection.setRequestProperty("Referer", "https://www.bilibili.com/");
            connection.setRequestProperty("Accept", "*/*");
            // Keeps Content-Length meaningful when we stream the body back.
            connection.setRequestProperty("Accept-Encoding", "identity");

            String range = header(request.getRequestHeaders(), "Range");
            if (range != null && !range.isEmpty()) {
                connection.setRequestProperty("Range", range);
            }

            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                Log.w("BiliMedia", "upstream HTTP " + status + " for " + request.getUrl().getHost());
                connection.disconnect();
                return null;
            }

            Map<String, String> responseHeaders = new HashMap<>();
            for (String name : new String[] { "Content-Length", "Content-Range", "Accept-Ranges", "Last-Modified", "ETag" }) {
                String value = connection.getHeaderField(name);
                if (value != null) {
                    responseHeaders.put(name, value);
                }
            }

            String contentType = connection.getContentType();
            if (contentType == null || contentType.toLowerCase(Locale.ROOT).contains("octet-stream")) {
                contentType = "audio/mp4";
            }
            int semicolon = contentType.indexOf(';');
            if (semicolon > 0) {
                contentType = contentType.substring(0, semicolon);
            }

            InputStream body = "HEAD".equalsIgnoreCase(request.getMethod()) ? null : connection.getInputStream();
            String reason = status == 206 ? "Partial Content" : "OK";

            Log.d(
                    "BiliMedia",
                    "stream " + status + " " + contentType + " range=" + range
                            + " len=" + connection.getHeaderField("Content-Length") + " host=" + request.getUrl().getHost());

            return new WebResourceResponse(contentType, null, status, reason, responseHeaders, closeBody(body, connection));
        } catch (Exception error) {
            Log.w("BiliMedia", "stream failed: " + error);
            if (connection != null) {
                connection.disconnect();
            }
            // Fall through to the default client; the player can still fall back
            // to the buffered-download path when this happens.
            return null;
        }
    }

    /** Closes the HTTP connection together with the stream handed to WebView. */
    private static InputStream closeBody(InputStream body, HttpURLConnection connection) {
        if (body == null) {
            return null;
        }

        return new FilterInputStream(body) {
            @Override
            public void close() throws IOException {
                try {
                    super.close();
                } finally {
                    connection.disconnect();
                }
            }
        };
    }
}
