import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, Lock, Shield, CreditCard, LogOut, LayoutDashboard, DollarSign } from "lucide-react";

export default function Profile() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Top navigation bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" size="sm" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <Card className="shadow-sm">
              <CardHeader className="items-center text-center pb-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                      {user.name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Badge className="absolute bottom-0 right-0 border-2 border-background" variant="secondary">
                    Free
                  </Badge>
                </div>
                <div className="mt-4 space-y-1">
                  <CardTitle className="text-xl">{user.name}</CardTitle>
                  <CardDescription className="text-sm">{user.email}</CardDescription>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Member since 2025</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Account verified</span>
                </div>
                <Separator className="my-4" />
                <Button 
                  variant="outline" 
                  className="w-full gap-2 hover:bg-destructive hover:text-destructive-foreground transition-colors" 
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </Button>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-9">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Account</CardTitle>
                <CardDescription>Manage your profile, security, and subscription settings</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 lg:w-auto">
                    <TabsTrigger value="profile" className="gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Profile</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2">
                      <Lock className="h-4 w-4" />
                      <span className="hidden sm:inline">Security</span>
                    </TabsTrigger>
                    <TabsTrigger value="subscriptions" className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span className="hidden sm:inline">Subscriptions</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="space-y-6 pt-6">
                    <Card className="border-muted">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          <CardTitle>Profile details</CardTitle>
                        </div>
                        <CardDescription>Basic information about your account</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-muted-foreground">Name</p>
                              <p className="text-base font-semibold">{user.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-muted-foreground">Email</p>
                              <p className="text-base font-semibold">{user.email}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="security" className="space-y-6 pt-6">
                    <Card className="border-muted">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Lock className="h-5 w-5 text-primary" />
                          <CardTitle>Password</CardTitle>
                        </div>
                        <CardDescription>Keep your account secure by using a strong password.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="font-medium">Change your password</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Update your password to keep your account secure
                            </p>
                          </div>
                          <Button disabled variant="outline" className="gap-2">
                            <Lock className="h-4 w-4" />
                            Change password
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-muted">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          <CardTitle>Two-factor authentication</CardTitle>
                        </div>
                        <CardDescription>Add an extra layer of security to your account.</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="font-medium">Enable 2FA</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Protect your account with two-factor authentication
                            </p>
                          </div>
                          <Button disabled variant="outline" className="gap-2">
                            <Shield className="h-4 w-4" />
                            Enable 2FA
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="subscriptions" className="space-y-6 pt-6">
                    <Card className="border-muted">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-primary" />
                          <CardTitle>Subscription</CardTitle>
                        </div>
                        <CardDescription>Manage your plan and billing</CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">Free Plan</Badge>
                            </div>
                            <p className="font-medium">You are currently on the free plan</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Upgrade to unlock premium features and benefits
                            </p>
                          </div>
                          <Link to="/pricing">
                            <Button className="gap-2">
                              <DollarSign className="h-4 w-4" />
                              View plans
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
