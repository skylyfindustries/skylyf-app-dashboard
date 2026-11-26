import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { settingsAPI } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Landmark, FileCheck, Loader2, Save } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await settingsAPI.get();
      setSettings(res.data);
    } catch (error: any) {
      toast({
        title: "Error fetching settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setSettings((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleTermsChange = (index: number, value: string) => {
    const newTerms = [...settings.quotationTerms];
    newTerms[index] = value;
    setSettings((prev: any) => ({ ...prev, quotationTerms: newTerms }));
  };

  const addTerm = () => {
    setSettings((prev: any) => ({
      ...prev,
      quotationTerms: [...prev.quotationTerms, ""],
    }));
  };

  const removeTerm = (index: number) => {
    const newTerms = settings.quotationTerms.filter(
      (_: any, i: number) => i !== index,
    );
    setSettings((prev: any) => ({ ...prev, quotationTerms: newTerms }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.update(settings);
      toast({
        title: "Settings updated",
        description: "Quotation template settings have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Quotation Settings">
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Quotation Settings">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Template Settings
            </h2>
            <p className="text-muted-foreground">
              Configure your company information and quotation template
              defaults.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="general" className="gap-2">
              <Building2 className="w-4 h-4" />
              General Info
            </TabsTrigger>
            <TabsTrigger value="bank" className="gap-2">
              <Landmark className="w-4 h-4" />
              Bank Details
            </TabsTrigger>
            <TabsTrigger value="terms" className="gap-2">
              <FileCheck className="w-4 h-4" />
              Terms & Footer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  This information will appear in the header of your quotations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input placeholder="e.g. Skylyf Pvt Ltd"
                      id="companyName"
                      name="companyName"
                      value={settings.companyName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyGST">GST Number</Label>
                    <Input
                      id="companyGST"
                      name="companyGST"
                      value={settings.companyGST}
                      onChange={handleChange}
                      placeholder="e.g. 07AAAAA0000A1Z5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Company Address</Label>
                  <Textarea
                    placeholder="Street, area, city, pincode"
                    id="companyAddress"
                    name="companyAddress"
                    rows={3}
                    value={settings.companyAddress}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Phone Number</Label>
                    <Input placeholder="+91 98765 43210"
                      id="companyPhone"
                      name="companyPhone"
                      value={settings.companyPhone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Email Address</Label>
                    <Input placeholder="name@company.com"
                      id="companyEmail"
                      name="companyEmail"
                      type="email"
                      value={settings.companyEmail}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">Website URL</Label>
                  <Input
                    id="companyWebsite"
                    name="companyWebsite"
                    value={settings.companyWebsite}
                    onChange={handleChange}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    name="logoUrl"
                    value={settings.logoUrl}
                    onChange={handleChange}
                    placeholder="https://yourdomain.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to a public URL of your company logo.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Banking Details</CardTitle>
                <CardDescription>
                  These details will be included in the bottom section for
                  payments.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccountName">Account Holder Name</Label>
                  <Input placeholder="e.g. Skylyf Pvt Ltd"
                    id="bankAccountName"
                    name="bankAccountName"
                    value={settings.bankAccountName}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Account Number</Label>
                    <Input placeholder="e.g. 123456789012"
                      id="bankAccountNumber"
                      name="bankAccountNumber"
                      value={settings.bankAccountNumber}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankIFSC">IFSC Code</Label>
                    <Input placeholder="e.g. HDFC0001234"
                      id="bankIFSC"
                      name="bankIFSC"
                      value={settings.bankIFSC}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input placeholder="e.g. HDFC Bank"
                      id="bankName"
                      name="bankName"
                      value={settings.bankName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankBranch">Branch Name</Label>
                    <Input placeholder="e.g. Ahmedabad Main"
                      id="bankBranch"
                      name="bankBranch"
                      value={settings.bankBranch}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms">
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
                <CardDescription>
                  Default T&C that will be added to every new quotation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {settings.quotationTerms.map(
                    (term: string, index: number) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={term}
                          onChange={(e) =>
                            handleTermsChange(index, e.target.value)
                          }
                          placeholder={`Term ${index + 1}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive h-10 w-10 shrink-0"
                          onClick={() => removeTerm(index)}
                        >
                          &times;
                        </Button>
                      </div>
                    ),
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTerm}
                    className="w-full border-dashed"
                  >
                    + Add More Term
                  </Button>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="quotationTitle">Quotation Page Title</Label>
                    <Input
                      id="quotationTitle"
                      name="quotationTitle"
                      value={settings.quotationTitle}
                      onChange={handleChange}
                      placeholder="e.g. PROFORMA INVOICE"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quotationFooter">Footer Message</Label>
                    <Textarea
                      id="quotationFooter"
                      name="quotationFooter"
                      rows={2}
                      value={settings.quotationFooter}
                      onChange={handleChange}
                      placeholder="e.g. This is a computer generated document."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
