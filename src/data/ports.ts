export type Category = "remote" | "web" | "data" | "mail" | "infra" | "misc";

export interface PortDef {
  port: number;
  proto: "tcp" | "udp";
  service: string;
  category: Category;
  risk: 0 | 1 | 2 | 3;
  commonality: number; // 0..1 likelihood of being open on a typical host
  desc: string;
  banners: string[];
}

export const CATEGORY_LABEL: Record<Category, string> = {
  remote: "Remote access",
  web: "Web / app",
  data: "Databases",
  mail: "Mail",
  infra: "Infra / core",
  misc: "IoT & misc",
};

export const PORT_DB: PortDef[] = [
  // ---- remote access ----
  { port: 22, proto: "tcp", service: "ssh", category: "remote", risk: 1, commonality: 0.9, desc: "Secure Shell — encrypted remote admin. Hardened by default; watch for password auth.", banners: ["SSH-2.0-OpenSSH_9.6p1", "SSH-2.0-OpenSSH_8.9p1 Ubuntu-3", "SSH-2.0-dropbear_2022.83"] },
  { port: 23, proto: "tcp", service: "telnet", category: "remote", risk: 3, commonality: 0.35, desc: "Cleartext remote shell. Credentials travel unencrypted — replace with SSH immediately.", banners: ["BusyBox telnetd", "Linux telnetd", "Welcome to maintenance shell"] },
  { port: 135, proto: "tcp", service: "msrpc", category: "remote", risk: 3, commonality: 0.4, desc: "Microsoft RPC endpoint mapper. Historic worm vector; bind to internal NICs only.", banners: ["Microsoft EPMAP", "ncacn_ip_tcp"] },
  { port: 139, proto: "tcp", service: "netbios-ssn", category: "remote", risk: 3, commonality: 0.38, desc: "NetBIOS session service. Legacy Windows file sharing surface.", banners: ["Samba 4.15.13", "Windows 10 netbios"] },
  { port: 445, proto: "tcp", service: "microsoft-ds", category: "remote", risk: 3, commonality: 0.45, desc: "SMB over TCP — EternalBlue's front door. Never expose to the internet.", banners: ["SMB 3.1.1 (Windows Server 2022)", "Samba 4.17.7"] },
  { port: 3389, proto: "tcp", service: "rdp", category: "remote", risk: 3, commonality: 0.42, desc: "Remote Desktop Protocol. Prime brute-force and BlueKeep target; gate behind VPN.", banners: ["Terminal Services", "RDP 10.0 build 20348"] },
  { port: 5900, proto: "tcp", service: "vnc", category: "remote", risk: 3, commonality: 0.28, desc: "VNC remote framebuffer. Many builds ship weak or no encryption.", banners: ["RFB 003.008", "TightVNC server"] },
  { port: 2222, proto: "tcp", service: "ssh-alt", category: "remote", risk: 1, commonality: 0.3, desc: "Common non-standard SSH port. Obscurity is not a control.", banners: ["SSH-2.0-OpenSSH_9.3"] },
  // ---- web ----
  { port: 80, proto: "tcp", service: "http", category: "web", risk: 1, commonality: 0.85, desc: "Plain HTTP. Redirect to TLS and set HSTS on the secure vhost.", banners: ["nginx/1.25.3", "Apache/2.4.58 (Debian)", "cloudflare", "Caddy"] },
  { port: 443, proto: "tcp", service: "https", category: "web", risk: 0, commonality: 0.9, desc: "HTTPS. Check certificate chain, protocol floor (TLS 1.2+) and HSTS.", banners: ["nginx/1.25.3 (TLS 1.3)", "Apache/2.4.58 OpenSSL/3.0.13", "envoy", "gws"] },
  { port: 8080, proto: "tcp", service: "http-proxy", category: "web", risk: 1, commonality: 0.55, desc: "Alternate HTTP / proxy. Often an admin UI that forgot to require auth.", banners: ["Jetty(9.4.53)", "nginx/1.24.0", "Werkzeug/3.0.1 Python/3.11"] },
  { port: 8443, proto: "tcp", service: "https-alt", category: "web", risk: 1, commonality: 0.4, desc: "Alternate HTTPS — frequently management consoles and CI dashboards.", banners: ["nginx (TLS 1.2)", "Kestrel", "openresty"] },
  { port: 8000, proto: "tcp", service: "http-alt", category: "web", risk: 1, commonality: 0.45, desc: "Dev servers love this port. Make sure it isn't a debug console in prod.", banners: ["Gunicorn/21.2.0", "uvicorn", "SimpleHTTP/0.6 Python/3.12"] },
  { port: 3000, proto: "tcp", service: "dev-http", category: "web", risk: 2, commonality: 0.35, desc: "Typical dev-server port (Grafana, Node, Rails). Rarely meant for public view.", banners: ["Grafana v10.4.1", "Express", "Next.js"] },
  { port: 8888, proto: "tcp", service: "notebook", category: "web", risk: 2, commonality: 0.25, desc: "Jupyter Notebook default. Token-less notebooks are instant RCE.", banners: ["TornadoServer/6.4", "Jupyter Notebook 7.1"] },
  { port: 9090, proto: "tcp", service: "prometheus", category: "web", risk: 1, commonality: 0.3, desc: "Prometheus metrics. Leaks infrastructure topology to anyone who asks.", banners: ["Prometheus/2.51.0"] },
  { port: 9000, proto: "tcp", service: "php-fpm", category: "web", risk: 2, commonality: 0.3, desc: "PHP-FPM. Exposed FPM plus a crafted request equals code execution.", banners: ["PHP-FPM 8.3", "fastcgi"] },
  { port: 8081, proto: "tcp", service: "http-mgmt", category: "web", risk: 1, commonality: 0.3, desc: "Secondary HTTP management port (Nexus, SonarQube, proxies).", banners: ["SonarQube", "Nexus/3.66", "squid/5.7"] },
  // ---- databases ----
  { port: 3306, proto: "tcp", service: "mysql", category: "data", risk: 2, commonality: 0.5, desc: "MySQL. Bind to localhost or private subnets; rotate root credentials.", banners: ["8.0.36-0ubuntu0.22.04.1", "MariaDB 10.11.6", "5.7.44-log"] },
  { port: 5432, proto: "tcp", service: "postgresql", category: "data", risk: 2, commonality: 0.45, desc: "PostgreSQL. Check pg_hba.conf trust rules and ssl mode.", banners: ["PostgreSQL 16.2", "PostgreSQL 14.11"] },
  { port: 6379, proto: "tcp", service: "redis", category: "data", risk: 3, commonality: 0.35, desc: "Redis — routinely found unauthenticated on the internet. CONFIG SET to RCE.", banners: ["Redis 7.2.4 (unauthenticated)", "redis 6.2.14"] },
  { port: 27017, proto: "tcp", service: "mongodb", category: "data", risk: 3, commonality: 0.3, desc: "MongoDB. Default no-auth deployments still get ransomed daily.", banners: ["MongoDB 7.0.5", "MongoDB 5.0.24"] },
  { port: 9200, proto: "tcp", service: "elasticsearch", category: "data", risk: 3, commonality: 0.25, desc: "Elasticsearch HTTP API. Open clusters expose every indexed document.", banners: ["Elasticsearch 8.12.2 (cluster: prod-es)"] },
  { port: 1433, proto: "tcp", service: "mssql", category: "data", risk: 3, commonality: 0.28, desc: "Microsoft SQL Server. xp_cmdshell on a public listener is game over.", banners: ["MS SQL 2019 (15.00.4355)", "MS SQL 2022"] },
  { port: 1521, proto: "tcp", service: "oracle-tns", category: "data", risk: 2, commonality: 0.2, desc: "Oracle TNS listener. TNS poisoning and SID brute-force are well documented.", banners: ["Oracle TNS 19c", "TNSLSNR 21.0"] },
  { port: 11211, proto: "tcp", service: "memcached", category: "data", risk: 3, commonality: 0.22, desc: "Memcached. Unauthenticated and a record-setting amplification vector.", banners: ["memcached 1.6.24"] },
  { port: 9300, proto: "tcp", service: "es-transport", category: "data", risk: 2, commonality: 0.18, desc: "Elasticsearch cluster transport. Rogue node joins when unsecured.", banners: ["es-transport 8.12"] },
  { port: 50000, proto: "tcp", service: "db2", category: "data", risk: 2, commonality: 0.12, desc: "IBM DB2 DRDA. Often forgotten on mainframe-adjacent estates.", banners: ["DB2/LINUXX8664 11.5"] },
  // ---- mail ----
  { port: 25, proto: "tcp", service: "smtp", category: "mail", risk: 1, commonality: 0.4, desc: "SMTP relay. Test for open relay — spammers will find it first.", banners: ["Postfix (ESMTP)", "Sendmail 8.17.2", "Exim 4.97"] },
  { port: 110, proto: "tcp", service: "pop3", category: "mail", risk: 2, commonality: 0.2, desc: "POP3 in cleartext. Credentials readable by anyone on the path.", banners: ["Dovecot ready", "Qpopper 4.1.0"] },
  { port: 143, proto: "tcp", service: "imap", category: "mail", risk: 2, commonality: 0.22, desc: "IMAP in cleartext. Prefer IMAPS on 993 with enforced TLS.", banners: ["Dovecot IMAP ready", "Courier-IMAP 5.2"] },
  { port: 465, proto: "tcp", service: "smtps", category: "mail", risk: 0, commonality: 0.3, desc: "SMTP over implicit TLS. Verify STARTTLS isn't silently downgradable.", banners: ["Postfix ESMTPS", "Microsoft ESMTP"] },
  { port: 587, proto: "tcp", service: "submission", category: "mail", risk: 1, commonality: 0.32, desc: "Mail submission with STARTTLS + auth. Confirm auth is actually required.", banners: ["Postfix ESMTP (auth)", "MailEnable ESMTP"] },
  { port: 993, proto: "tcp", service: "imaps", category: "mail", risk: 0, commonality: 0.28, desc: "IMAP over TLS — the sane way to fetch mail.", banners: ["Dovecot IMAPS", "Cyrus imapd v2.5 TLS"] },
  { port: 995, proto: "tcp", service: "pop3s", category: "mail", risk: 1, commonality: 0.18, desc: "POP3 over TLS. Legacy protocol, but at least it's encrypted.", banners: ["Dovecot POP3s ready"] },
  // ---- infra / core ----
  { port: 21, proto: "tcp", service: "ftp", category: "infra", risk: 2, commonality: 0.4, desc: "FTP — cleartext credentials, and anonymous logins love to appear.", banners: ["vsftpd 3.0.5", "ProFTPD 1.3.8", "FileZilla Server 1.7"] },
  { port: 53, proto: "tcp", service: "domain", category: "infra", risk: 1, commonality: 0.5, desc: "DNS over TCP. Open resolvers fuel reflection attacks; restrict recursion.", banners: ["BIND 9.18.24", "Unbound 1.19", "PowerDNS 4.8"] },
  { port: 53, proto: "udp", service: "domain", category: "infra", risk: 1, commonality: 0.5, desc: "DNS over UDP — the classic amplification reflector when open.", banners: ["BIND 9.18.24 (UDP)", "dnsmasq-2.90"] },
  { port: 67, proto: "udp", service: "dhcp", category: "infra", risk: 1, commonality: 0.3, desc: "DHCP server. Rogue DHCP on a flat LAN hands out attacker gateways.", banners: ["ISC DHCP 4.4.3"] },
  { port: 69, proto: "udp", service: "tftp", category: "infra", risk: 2, commonality: 0.15, desc: "TFTP — no auth at all. Common on network gear for firmware pulls.", banners: ["tftpd-hpa 5.2"] },
  { port: 111, proto: "tcp", service: "rpcbind", category: "infra", risk: 2, commonality: 0.3, desc: "Portmapper. Enumerates every RPC service for an attacker's shopping list.", banners: ["rpcbind 1.2.6"] },
  { port: 123, proto: "udp", service: "ntp", category: "infra", risk: 1, commonality: 0.4, desc: "NTP. Patch monlist (CVE-2013-5211 era) or it amplifies 556×.", banners: ["ntpd 4.2.8p17", "chronyd 4.5"] },
  { port: 161, proto: "udp", service: "snmp", category: "infra", risk: 2, commonality: 0.3, desc: "SNMP v1/v2c with community 'public' leaks whole device configs.", banners: ["SNMPv2c (community: public)", "net-snmp 5.9.4"] },
  { port: 389, proto: "tcp", service: "ldap", category: "infra", risk: 2, commonality: 0.25, desc: "LDAP. Null-base queries enumerate your whole directory.", banners: ["OpenLDAP 2.6.7", "Microsoft AD LDS"] },
  { port: 2049, proto: "tcp", service: "nfs", category: "infra", risk: 2, commonality: 0.22, desc: "NFS exports. no_root_squash plus 0.0.0.0/0 is a data-heist kit.", banners: ["nfs 4.2 (Linux)", "nfsd 3"] },
  { port: 6443, proto: "tcp", service: "k8s-api", category: "infra", risk: 2, commonality: 0.2, desc: "Kubernetes API server. Anonymous auth misconfig = cluster admin.", banners: ["kube-apiserver v1.29.2"] },
  { port: 50070, proto: "tcp", service: "hadoop-nn", category: "infra", risk: 2, commonality: 0.1, desc: "Hadoop NameNode UI. Cluster filesystem browsable without auth.", banners: ["Jetty(hadoop)"] },
  // ---- misc / iot ----
  { port: 81, proto: "tcp", service: "http-mgmt2", category: "misc", risk: 2, commonality: 0.2, desc: "Alternate web management — router panels with default creds.", banners: ["GoAhead-Webs", "mini_httpd/1.30"] },
  { port: 162, proto: "udp", service: "snmptrap", category: "misc", risk: 1, commonality: 0.12, desc: "SNMP traps. Forged traps can spoof alerts and mask real incidents.", banners: ["snmptrapd 5.9"] },
  { port: 1900, proto: "udp", service: "ssdp", category: "misc", risk: 2, commonality: 0.4, desc: "UPnP/SSDP. The second-largest amplification reflector after memcached.", banners: ["UPnP/1.1 (Linux UPnP/1.8)"] },
  { port: 5060, proto: "udp", service: "sip", category: "misc", risk: 2, commonality: 0.2, desc: "SIP telephony. Toll-fraud bots sweep this port around the clock.", banners: ["Asterisk PBX 20.2", "FreeSWITCH 1.10"] },
  { port: 5353, proto: "udp", service: "mdns", category: "misc", risk: 1, commonality: 0.35, desc: "mDNS/Bonjour. Broadcasts hostnames and services to the whole segment.", banners: ["Avahi 0.8", "Bonjour/398.40"] },
  { port: 8291, proto: "tcp", service: "mikrotik", category: "misc", risk: 3, commonality: 0.12, desc: "MikroTik Winbox. CVE-2018-14847 still pays out credentials in the wild.", banners: ["MikroTik RouterOS 6.49 (Winbox)"] },
  { port: 37215, proto: "tcp", service: "huawei-upnp", category: "misc", risk: 3, commonality: 0.08, desc: "Huawei router remote code execution surface (CVE-2017-17215).", banners: ["UPnP/1.0 Huawei HG532"] },
  { port: 9100, proto: "tcp", service: "jetdirect", category: "misc", risk: 1, commonality: 0.15, desc: "Raw printing (JetDirect). Printers hold docs, Wi-Fi keys and patience.", banners: ["HP JetDirect", "RAW port enabled"] },
  { port: 10001, proto: "udp", service: "ubnt", category: "misc", risk: 1, commonality: 0.18, desc: "Ubiquiti discovery. Responds to any query with device MAC and firmware.", banners: ["UBNT discovery v1"] },
  { port: 4443, proto: "tcp", service: "pharos", category: "misc", risk: 1, commonality: 0.1, desc: "Alternate HTTPS often used by C2 frameworks and admin consoles alike.", banners: ["nginx (unknown vhost)"] },
  { port: 5000, proto: "tcp", service: "upnp-http", category: "misc", risk: 2, commonality: 0.3, desc: "Dev tools, NAS admin, and a certain Flask debug console with a PIN bypass.", banners: ["Werkzeug/2.2.3 (debug)", "Synology DSM"] },
];

export const QUICK_TARGETS = [
  "192.168.1.1",
  "10.0.0.27",
  "172.16.4.9",
  "edge.dc7.internal",
  "203.0.113.42",
];
