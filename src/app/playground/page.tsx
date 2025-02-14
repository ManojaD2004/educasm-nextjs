"use client";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout/Layout";
import { PlaygroundView } from "../components/Playground/PlaygroundView";
// import { TestView } from './components/Test/TestView';
import { PreFillForm } from "../components/shared/PreFillForm";
import { UserContext } from "../types";
import { Toaster, toast } from "react-hot-toast";
import { GoogleTagManager } from "../components/shared/GoogleTagManager";
import LoadGoogleAdsIframe from "../components/LoadGoogleAdsIframe";
import LoadGoogleTagManager from "../components/LoadGoogleTagManager";

export default function Home() {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const age = userContext?.age;
  useEffect(() => {
    if (age === undefined) {
      const userContextRaw = localStorage.getItem("userContext");
      if (!userContextRaw) {
        return;
      }
      const userContext: UserContext = JSON.parse(userContextRaw);
      setUserContext(userContext);
    }
  }, [age]);
  const handleError = (message: string) => {
    toast.error(message);
  };

  const handleSuccess = (message: string) => {
    toast.success(message);
  };

  if (!userContext) {
    return (
      <div className="min-h-screen bg-background text-white p-4">
        <PreFillForm
          onSubmit={(context) => {
            localStorage.setItem("userContext", JSON.stringify(context));
            setUserContext(context);
          }}
        />
      </div>
    );
  }
  return (
    <div id="root">
      <LoadGoogleAdsIframe />
      <LoadGoogleTagManager />
      <GoogleTagManager />
      <div className="min-h-screen bg-background text-white">
        <Toaster position="top-right" />
        <Layout>
          <PlaygroundView
            onError={handleError}
            onSuccess={handleSuccess}
            userContext={userContext}
          />
        </Layout>
      </div>
    </div>
  );
}
