import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return await apiRequest('POST', '/api/auth/login', { email, password });
    },
    onSuccess: () => {
      toast({
        title: "Kirjautuminen onnistui!",
        description: "Tervetuloa Ravintola Tirvan keittiöön",
      });
      onLogin();
    },
    onError: () => {
      toast({
        title: "Kirjautuminen epäonnistui",
        description: "Tarkista sähköposti ja salasana",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Puuttuvat tiedot",
        description: "Syötä sekä sähköposti että salasana",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-700 rounded-full flex items-center justify-center">
              <Utensils className="text-white text-2xl" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Ravintola Tirva
          </CardTitle>
          <p className="text-gray-600 mt-2">Keittiön hallintajärjestelmä</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Sähköposti</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full"
                disabled={loginMutation.isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Salasana</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10"
                  disabled={loginMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-green-700 hover:bg-green-800 text-white"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Kirjaudutaan..." : "Kirjaudu sisään"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}