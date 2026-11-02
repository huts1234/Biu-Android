package com.biu.music;

import android.util.Log;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Loopback HTTP server that streams Bilibili audio into the WebView.
 *
 * <p>Why not serve the bytes through {@code shouldInterceptRequest}? Chromium's
 * media stack does not reliably consume an intercepted response body (it ends
 * with MEDIA_ERR_SRC_NOT_SUPPORTED), so instead the player points
 * {@code <audio>} at {@code http://127.0.0.1:<port>/m/<url>} and this server
 * relays the CDN response, Range requests included. Playback starts as soon as
 * the first bytes arrive and seeking keeps working.
 */
public final class BiliStreamServer {

    private static final String TAG = "BiliStream";
    private static final String DESKTOP_UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                    + "Chrome/141.0.0.0 Safari/537.36";

    /** Hosts that only serve media; anything else is rejected to avoid an open proxy. */
    private static final String[] MEDIA_HOSTS = {
            "bilivideo.com", "bilivideo.cn", "bilivideo.net", "akamaized.net"
    };

    private static final int BUFFER = 32 * 1024;

    private static volatile int port = -1;
    private static ServerSocket serverSocket;
    private static ExecutorService workers;

    private BiliStreamServer() {}

    public static synchronized int start() throws IOException {
        if (port > 0) return port;

        ServerSocket socket = new ServerSocket(0, 16, InetAddress.getByName("127.0.0.1"));
        socket.setReuseAddress(true);
        serverSocket = socket;
        port = socket.getLocalPort();
        workers = Executors.newCachedThreadPool(runnable -> {
            Thread thread = new Thread(runnable, "BiliStream");
            thread.setDaemon(true);
            return thread;
        });

        Thread acceptor = new Thread(() -> {
            while (!socket.isClosed()) {
                try {
                    Socket client = socket.accept();
                    workers.execute(() -> handle(client));
                } catch (IOException error) {
                    if (!socket.isClosed()) {
                        Log.w(TAG, "accept failed: " + error);
                    }
                }
            }
        }, "BiliStreamAccept");
        acceptor.setDaemon(true);
        acceptor.start();

        Log.i(TAG, "listening on 127.0.0.1:" + port);
        return port;
    }

    private static void handle(Socket client) {
        try (Socket socket = client) {
            socket.setSoTimeout(30_000);
            BufferedInputStream input = new BufferedInputStream(socket.getInputStream());
            BufferedOutputStream output = new BufferedOutputStream(socket.getOutputStream());

            String requestLine = readLine(input);
            if (requestLine == null) return;

            String[] parts = requestLine.split(" ");
            if (parts.length < 2) return;

            String method = parts[0].toUpperCase(Locale.ROOT);
            String target = parts[1];

            Map<String, String> headers = new HashMap<>();
            String line;
            while ((line = readLine(input)) != null && !line.isEmpty()) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    headers.put(line.substring(0, colon).trim().toLowerCase(Locale.ROOT), line.substring(colon + 1).trim());
                }
            }

            if (!"GET".equals(method) && !"HEAD".equals(method)) {
                writeEmpty(output, 405, "Method Not Allowed");
                return;
            }

            String encoded = target.startsWith("/m/") ? target.substring(3) : null;
            if (encoded == null) {
                writeEmpty(output, 404, "Not Found");
                return;
            }

            String url;
            try {
                byte[] raw = android.util.Base64.decode(
                        encoded, android.util.Base64.URL_SAFE | android.util.Base64.NO_PADDING | android.util.Base64.NO_WRAP);
                url = new String(raw, StandardCharsets.UTF_8);
            } catch (IllegalArgumentException error) {
                writeEmpty(output, 400, "Bad Request");
                return;
            }

            if (!isAllowed(url)) {
                writeEmpty(output, 403, "Forbidden");
                return;
            }

            relay(url, method, headers, output);
        } catch (Exception error) {
            Log.w(TAG, "request failed: " + error);
        }
    }

    private static void relay(String url, String method, Map<String, String> requestHeaders, OutputStream output)
            throws IOException {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(30_000);
            connection.setRequestMethod("GET");
            connection.setRequestProperty("User-Agent", DESKTOP_UA);
            connection.setRequestProperty("Referer", "https://www.bilibili.com/");
            connection.setRequestProperty("Accept", "*/*");
            connection.setRequestProperty("Accept-Encoding", "identity");

            String range = requestHeaders.get("range");
            if (range != null && !range.isEmpty()) {
                connection.setRequestProperty("Range", range);
            }
            String ifRange = requestHeaders.get("if-range");
            if (ifRange != null && !ifRange.isEmpty()) {
                connection.setRequestProperty("If-Range", ifRange);
            }

            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                Log.w(TAG, "upstream " + status + " for " + hostOf(url));
                connection.disconnect();
                writeEmpty(output, status == 416 ? 416 : 502, "Bad Gateway");
                return;
            }

            String contentType = connection.getContentType();
            if (contentType == null || contentType.toLowerCase(Locale.ROOT).contains("octet-stream")) {
                contentType = "audio/mp4";
            }

            StringBuilder head = new StringBuilder();
            head.append("HTTP/1.1 ").append(status).append(status == 206 ? " Partial Content" : " OK").append("\r\n");
            head.append("Content-Type: ").append(contentType).append("\r\n");
            head.append("Access-Control-Allow-Origin: *\r\n");
            head.append("Cache-Control: no-store\r\n");
            head.append("Connection: close\r\n");

            for (String name : new String[] { "Content-Length", "Content-Range", "Accept-Ranges", "Last-Modified", "ETag" }) {
                String value = connection.getHeaderField(name);
                if (value != null) {
                    head.append(name).append(": ").append(value).append("\r\n");
                }
            }
            head.append("\r\n");

            output.write(head.toString().getBytes(StandardCharsets.UTF_8));
            output.flush();

            if (!"HEAD".equals(method)) {
                InputStream body;
                try {
                    body = connection.getInputStream();
                } catch (IOException error) {
                    body = connection.getErrorStream();
                }
                if (body != null) {
                    byte[] buffer = new byte[BUFFER];
                    int read;
                    while ((read = body.read(buffer)) > 0) {
                        output.write(buffer, 0, read);
                        output.flush();
                    }
                    body.close();
                }
            }
            output.flush();

            Log.d(TAG, "relayed " + status + " " + contentType + " range=" + requestHeaders.get("range")
                    + " len=" + connection.getHeaderField("Content-Length") + " host=" + hostOf(url));
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private static void writeEmpty(OutputStream output, int status, String reason) throws IOException {
        String body = "";
        String head = "HTTP/1.1 " + status + " " + reason + "\r\n"
                + "Content-Length: " + body.length() + "\r\n"
                + "Content-Type: text/plain; charset=utf-8\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Connection: close\r\n\r\n";
        output.write(head.getBytes(StandardCharsets.UTF_8));
        output.flush();
    }

    private static boolean isAllowed(String url) {
        String host = hostOf(url);
        if (host == null) return false;

        for (String suffix : MEDIA_HOSTS) {
            if (host.equals(suffix) || host.endsWith("." + suffix)) {
                return true;
            }
        }

        return false;
    }

    private static String hostOf(String url) {
        try {
            URL parsed = new URL(url);
            if (!"https".equalsIgnoreCase(parsed.getProtocol())) return null;
            String host = parsed.getHost();
            return host == null ? null : host.toLowerCase(Locale.ROOT);
        } catch (Exception error) {
            return null;
        }
    }

    private static String readLine(InputStream input) throws IOException {
        ByteArrayOutputStream line = new ByteArrayOutputStream(128);
        int current;
        while ((current = input.read()) != -1) {
            if (current == '\n') break;
            if (current != '\r') line.write(current);
            if (line.size() > 8 * 1024) break;
        }
        if (current == -1 && line.size() == 0) return null;
        return new String(line.toByteArray(), StandardCharsets.UTF_8);
    }
}
