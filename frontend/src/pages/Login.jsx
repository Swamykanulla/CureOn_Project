import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, Stethoscope } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authService } from "@/services/api";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Patient");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpUsername, setFpUsername] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(username.trim(), password);
      if (user.must_change_password) {
        toast.success("Signed in with temporary password. Please set a new password.");
        navigate("/change-password");
        return;
      } else {
        toast.success(`Welcome back, ${user.username}!`);
      }
      
      // Navigate based on user role from backend
      const role = user.role; 
      if (role === "PATIENT") {
        navigate("/patient/dashboard");
      } else if (role === "DOCTOR") {
        navigate("/doctor/dashboard");
      } else if (role === "PHARMACY") {
        navigate("/pharmacy/dashboard");
      } else if (role === "LAB") {
        navigate("/labs/dashboard");
      } else if (role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        // Fallback or unknown role
        navigate("/");
      }
    } catch (error) {
      console.error(error);
      let errorMsg = "Login failed. Please check your credentials.";
      
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-[380px] animate-fade-up">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Stethoscope className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-2xl text-foreground">
              CureOn
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to access your account</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label>Sign in as</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Patient">Patient</SelectItem>
                    <SelectItem value="Doctor">Doctor</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="Labs">Labs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="username">Username</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-12 h-10 input-healthcare"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs font-medium text-primary hover:text-primary-dark hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-10 h-10 input-healthcare"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full mt-2 group" disabled={loading}>
                {loading ? "Signing in..." : `Sign In as ${role}`}
                {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </form>
          </div>
          
          <div className="bg-secondary/30 p-4 text-center border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 mt-8 text-sm text-muted-foreground/80">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure, encrypted connection</span>
        </div>
        <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Reset your password</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="fp-username">Username or Email</Label>
              <Input
                id="fp-username"
                type="text"
                value={fpUsername}
                onChange={(e) => setFpUsername(e.target.value)}
                placeholder="Enter your username or email"
              />
              <Button
                onClick={async () => {
                  if (!fpUsername.trim()) {
                    toast.error("Please enter your username or email");
                    return;
                  }
                  setFpLoading(true);
                  try {
                    await authService.forgotPassword(fpUsername.trim());
                    toast.success("If the user exists, a temporary password has been emailed.");
                    setForgotOpen(false);
                    setFpUsername("");
                  } catch (e) {
                    const msg = e?.response?.data?.detail || "Failed to send reset email";
                    toast.error(msg);
                  } finally {
                    setFpLoading(false);
                  }
                }}
                disabled={fpLoading}
                className="w-full"
              >
                {fpLoading ? "Sending..." : "Send Temporary Password"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Login;
