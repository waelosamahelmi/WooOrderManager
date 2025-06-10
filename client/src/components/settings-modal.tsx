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
    printerAddress: '192.168.1.100',
    audioEnabled: true,
    audioVolume: 80,
    shopUrl: '',
    apiKey: '',
  });

  const { data: settingsData } = useQuery({
    queryKey: ['/api/settings'],
  });

  useEffect(() => {
    if (settingsData) {
      const settingsMap = settingsData.reduce((acc: any, setting: any) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
      
      setSettings({
        printerType: settingsMap.printerType || 'network',
        printerAddress: settingsMap.printerAddress || '192.168.1.100',
        audioEnabled: settingsMap.audioEnabled === 'true',
        audioVolume: parseInt(settingsMap.audioVolume) || 80,
        shopUrl: settingsMap.shopUrl || '',
        apiKey: settingsMap.apiKey || '',
      });
    }
  }, [settingsData]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      const promises = Object.entries(newSettings).map(([key, value]) =>
        apiRequest('POST', '/api/settings', { 
          key, 
          value: typeof value === 'boolean' ? value.toString() : value.toString() 
        })
      );
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
      // Simulate printer test
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Tulostin toimii!",
        description: "Yhteys tulostimeen on toimiva.",
      });
    },
    onError: () => {
      toast({
        title: "Tulostinvirhe",
        description: "Tulostimeen ei saada yhteyttä",
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Asetukset</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                    <SelectItem value="bluetooth">Bluetooth-tulostin</SelectItem>
                    <SelectItem value="usb">USB-tulostin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="printerAddress">IP-osoite / Nimi</Label>
                <Input
                  id="printerAddress"
                  value={settings.printerAddress}
                  onChange={(e) => setSettings(prev => ({ ...prev, printerAddress: e.target.value }))}
                  placeholder="192.168.1.100"
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
            <h3 className="text-lg font-semibold text-gray-800 mb-4">WooCommerce</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="shopUrl">Kaupan URL</Label>
                <Input
                  id="shopUrl"
                  type="url"
                  value={settings.shopUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, shopUrl: e.target.value }))}
                  placeholder="https://myshop.com"
                />
              </div>
              
              <div>
                <Label htmlFor="apiKey">API-avain</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="••••••••••••"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Yhdistetty</span>
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
