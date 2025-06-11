import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Printer } from "lucide-react";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    printerType: 'network',
    printerIp: '192.168.1.100',
    printerPort: '9100',
    printerName: 'Kitchen Printer',
    audioEnabled: true,
    audioVolume: 80,
    shopUrl: 'https://mediumorchid-yak-784527.hostingersite.com',
    consumerKey: 'ck_edfde45d123a01595797228ecacea44181d05ea4',
    consumerSecret: 'cs_650879cb1fd02f1331bed8bc948852d4d2b6c701',
    webhookSecret: '',
  });

  const [isTestingWooCommerce, setIsTestingWooCommerce] = useState(false);
  const [wooCommerceStatus, setWooCommerceStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  const { data: settingsData } = useQuery({
    queryKey: ['/api/settings'],
  });

  useEffect(() => {
    if (settingsData && Array.isArray(settingsData)) {
      const settingsMap = settingsData.reduce((acc: any, setting: any) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
      
      setSettings({
        printerType: settingsMap.printerType || 'network',
        printerIp: settingsMap.printerIp || '192.168.1.100',
        printerPort: settingsMap.printerPort || '9100',
        printerName: settingsMap.printerName || 'Kitchen Printer',
        audioEnabled: settingsMap.audioEnabled === 'true',
        audioVolume: parseInt(settingsMap.audioVolume) || 80,
        shopUrl: settingsMap.woocommerceUrl || 'https://mediumorchid-yak-784527.hostingersite.com',
        consumerKey: settingsMap.woocommerceKey || 'ck_edfde45d123a01595797228ecacea44181d05ea4',
        consumerSecret: settingsMap.woocommerceSecret || 'cs_650879cb1fd02f1331bed8bc948852d4d2b6c701',
        webhookSecret: settingsMap.webhookSecret || '',
      });
    }
  }, [settingsData]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      // Map frontend setting names to backend setting names
      const settingMappings = {
        shopUrl: 'woocommerceUrl',
        consumerKey: 'woocommerceKey', 
        consumerSecret: 'woocommerceSecret',
      };
      
      const promises = Object.entries(newSettings).map(([key, value]) => {
        const backendKey = (settingMappings as any)[key] || key;
        return apiRequest('POST', '/api/settings', { 
          key: backendKey, 
          value: typeof value === 'boolean' ? value.toString() : value.toString() 
        });
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Asetukset tallennettu!",
        description: "Kaikki asetukset on päivitetty onnistuneesti.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Virhe",
        description: "Asetusten tallentaminen epäonnistui",
        variant: "destructive",
      });
    }
  });

  const testPrinterMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/printer/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ip: settings.printerIp,
          port: settings.printerPort
        })
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Tulostin toimii!",
          description: "Yhteys tulostimeen onnistui.",
        });
      } else {
        toast({
          title: "Tulostinvirhe",
          description: data.message || "Tulostimeen ei saada yhteyttä",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Tulostinvirhe",
        description: "Yhteyden testaus epäonnistui",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleTestPrinter = () => {
    toast({
      title: "Testataan tulostinta...",
      description: "Odota hetki...",
    });
    testPrinterMutation.mutate();
  };

  const testWooCommerceConnection = async () => {
    setIsTestingWooCommerce(true);
    console.log('Testing WooCommerce with settings:', {
      shopUrl: settings.shopUrl,
      consumerKey: settings.consumerKey?.substring(0, 10) + '...',
      consumerSecret: settings.consumerSecret?.substring(0, 10) + '...'
    });
    
    try {
      const res = await apiRequest('POST', '/api/woocommerce/test', {
        shopUrl: settings.shopUrl,
        consumerKey: settings.consumerKey,
        consumerSecret: settings.consumerSecret,
      });

      const response = await res.json();
      console.log('WooCommerce test response:', response);

      if (response.success) {
        setWooCommerceStatus('connected');
        toast({
          title: "WooCommerce yhteys toimii",
          description: "API-yhteys kauppaan onnistui",
        });
      } else {
        setWooCommerceStatus('error');
        toast({
          title: "WooCommerce yhteysvirhe",
          description: response.message || "Tarkista API-tunnukset",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('WooCommerce test error:', error);
      setWooCommerceStatus('error');
      toast({
        title: "WooCommerce yhteysvirhe",
        description: error instanceof Error ? error.message : "Verkkovirhe tai väärät tunnukset",
        variant: "destructive",
      });
    } finally {
      setIsTestingWooCommerce(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asetukset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-4">
          {/* Printer Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tulostin</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="printerType">Tulostimen tyyppi</Label>
                <Select
                  value={settings.printerType}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, printerType: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="network">Verkkotulostin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="printerIp">IP-osoite</Label>
                <Input
                  id="printerIp"
                  value={settings.printerIp}
                  onChange={(e) => setSettings(prev => ({ ...prev, printerIp: e.target.value }))}
                  placeholder="192.168.1.100"
                />
              </div>
              
              <div>
                <Label htmlFor="printerPort">Portti</Label>
                <Input
                  id="printerPort"
                  value={settings.printerPort}
                  onChange={(e) => setSettings(prev => ({ ...prev, printerPort: e.target.value }))}
                  placeholder="9100"
                />
              </div>
              
              <div>
                <Label htmlFor="printerName">Tulostimen nimi</Label>
                <Input
                  id="printerName"
                  value={settings.printerName}
                  onChange={(e) => setSettings(prev => ({ ...prev, printerName: e.target.value }))}
                  placeholder="Kitchen Printer"
                />
              </div>
              
              <Button
                onClick={handleTestPrinter}
                disabled={testPrinterMutation.isPending}
                className="w-full"
              >
                <Printer className="w-4 h-4 mr-2" />
                {testPrinterMutation.isPending ? 'Testataan...' : 'Testaa tulostin'}
              </Button>
            </div>
          </div>

          {/* Notification Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ilmoitukset</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="audioEnabled">Äänilmoitukset</Label>
                <Switch
                  id="audioEnabled"
                  checked={settings.audioEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, audioEnabled: checked }))}
                />
              </div>
              
              <div>
                <Label htmlFor="audioVolume">Äänenvoimakkuus</Label>
                <div className="mt-2">
                  <Slider
                    value={[settings.audioVolume]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, audioVolume: value }))}
                    max={100}
                    min={0}
                    step={10}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-500 mt-1">{settings.audioVolume}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* WooCommerce Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">WooCommerce</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="shopUrl">Kaupan URL</Label>
                <Input
                  id="shopUrl"
                  type="url"
                  value={settings.shopUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, shopUrl: e.target.value }))}
                  placeholder="https://helmies.fi"
                />
              </div>
              
              <div>
                <Label htmlFor="consumerKey">Consumer Key</Label>
                <Input
                  id="consumerKey"
                  type="password"
                  value={settings.consumerKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, consumerKey: e.target.value }))}
                  placeholder="ck_••••••••••••"
                />
              </div>
              
              <div>
                <Label htmlFor="consumerSecret">Consumer Secret</Label>
                <Input
                  id="consumerSecret"
                  type="password"
                  value={settings.consumerSecret}
                  onChange={(e) => setSettings(prev => ({ ...prev, consumerSecret: e.target.value }))}
                  placeholder="cs_••••••••••••"
                />
              </div>
              
              <div>
                <Label htmlFor="webhookSecret">Webhook Secret</Label>
                <Input
                  id="webhookSecret"
                  type="password"
                  value={settings.webhookSecret}
                  onChange={(e) => setSettings(prev => ({ ...prev, webhookSecret: e.target.value }))}
                  placeholder="Webhook secret key"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={testWooCommerceConnection}
                disabled={isTestingWooCommerce}
                className="w-full mt-3"
              >
                {isTestingWooCommerce ? 'Testataan...' : 'Testaa yhteys'}
              </Button>
              
              <div className="flex items-center space-x-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${wooCommerceStatus === 'connected' ? 'bg-green-500' : wooCommerceStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                <span className={`text-sm ${wooCommerceStatus === 'connected' ? 'text-green-600' : wooCommerceStatus === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
                  {wooCommerceStatus === 'connected' ? 'Yhdistetty' : wooCommerceStatus === 'error' ? 'Yhteysvirhe' : 'Ei testattu'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Actions */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Peruuta
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
            className="flex-1 bg-green-700 hover:bg-green-800"
          >
            {saveSettingsMutation.isPending ? 'Tallennetaan...' : 'Tallenna'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
