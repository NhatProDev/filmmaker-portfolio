// Preloaded into every test process (package.json "test"), before any module
// reads the server environment. The route tests stand behind one trusted
// proxy, so X-Forwarded-For's last entry is the client's address and each test
// can act as a distinct client (src/lib/http/request.ts).
process.env.TRUSTED_PROXY_HOPS ??= "1";
