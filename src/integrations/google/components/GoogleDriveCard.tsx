import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { GoogleConnect } from "./GoogleConnect";
import { Link } from "react-router-dom";

export function GoogleDriveCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Drive & Sheets</CardTitle>
        <CardDescription>Connect your Google account to enable Sheets integration.</CardDescription>
        <Link to="/apps/sheetsmanager"><p className="color-red">Go to Sheet Manager</p></Link>
      </CardHeader>
      <CardContent>
        <GoogleConnect />
      </CardContent>
    </Card>
  );
}
