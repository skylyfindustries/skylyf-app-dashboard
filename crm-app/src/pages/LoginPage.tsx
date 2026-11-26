import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { loginSchema, fieldErrors } from "@/lib/validation";
import logo from "../assets/images/logo.png";
import bgImage from "../assets/images/back.avif";
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const v = fieldErrors(loginSchema, { email, password });
    setErrors(v ?? {});
    if (v) {
      setShake((n) => n + 1);
      return;
    }
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "Login failed. Please check your credentials.");
      setShake((n) => n + 1);
    }
  };

  const inputCls =
    "w-full bg-muted rounded-lg border border-border px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div
        className="hidden lg:flex relative flex-col justify-between p-12 border-r border-border overflow-hidden"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-background/85" />
        <div className="relative z-10">
          <img src={logo} alt="Skylyf" className="h-14 w-auto" />
        </div>
        <div className="relative z-10 max-w-md">
          <div className="w-10 h-1 rounded-full bg-primary mb-6" />
          <h1 className="text-3xl font-semibold leading-tight text-foreground">
            Manufacturing ERP for spare parts, production and dispatch.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Track inventory, bills of material, orders and machines in one
            place.
          </p>
        </div>
        <p className="relative z-10 text-xs text-muted-foreground">
          © Skylyf
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">
          <img src={logo} alt="Skylyf" className="h-12 w-auto mb-8 lg:hidden" />
          <h2 className="text-2xl font-semibold text-foreground">Sign in</h2>
          <p className="text-sm text-muted-foreground mt-1.5 mb-8">
            Use your registered credentials to continue.
          </p>
          <form key={shake} noValidate onSubmit={handleSubmit} className={`space-y-4 ${shake ? "animate-shake" : ""}`}>
            {error && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm px-3 py-2.5 rounded-lg border border-destructive/20 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((x) => ({ ...x, email: "" }));
                  setError("");
                }}
                placeholder="email@skylyf.in"
                className={`${inputCls} ${errors.email ? "border-destructive" : ""}`}
                aria-invalid={!!errors.email}
                autoComplete="email"
                autoFocus
              />
              {errors.email && <p className="text-xs text-destructive mt-1.5 animate-fade-in">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((x) => ({ ...x, password: "" }));
                  setError("");
                }}
                placeholder="Enter your password"
                className={`${inputCls} ${errors.password ? "border-destructive" : ""}`}
                aria-invalid={!!errors.password}
                autoComplete="current-password"
              />
              {errors.password && <p className="text-xs text-destructive mt-1.5 animate-fade-in">{errors.password}</p>}
            </div>
            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
