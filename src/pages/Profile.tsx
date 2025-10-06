import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export default function Profile() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-muted-foreground">Name</div>
            <div className="col-span-2 font-medium">{user.name}</div>
            <div className="text-muted-foreground">Email</div>
            <div className="col-span-2 font-medium">{user.email}</div>
            {user.avatar && (
              <>
                <div className="text-muted-foreground">Avatar</div>
                <div className="col-span-2">
                  <img src={user.avatar} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
                </div>
              </>
            )}
          </div>
          <div className="pt-4">
            <Button variant="secondary" onClick={() => signOut()}>Log out</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
