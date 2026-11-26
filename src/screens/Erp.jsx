import { useLocation } from "react-router-dom";

// Factory pages (separate app served at /crm/) shown inside this dashboard's shell.
export default function Erp() {
  const { pathname, search } = useLocation();
  const sub = pathname.replace(/^\/erp\/?/, "");
  return <iframe className="erp-frame" title="Factory" src={`/crm/${sub}${search}`} />;
}
