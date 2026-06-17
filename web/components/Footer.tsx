export default function Footer() {
  return (
    <footer className="footer">
      Ultimate Mets Database · Data from the{" "}
      <a
        href="https://statsapi.mlb.com"
        target="_blank"
        rel="noreferrer"
      >
        MLB Stats API
      </a>
      , updated daily · Not affiliated with the New York Mets or MLB
    </footer>
  );
}
