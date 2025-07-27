
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/AppLayout';
import type { MarketAlert } from '@/lib/types';
import { Bell, Loader2, Trash2, CircleCheck, CircleX, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, query, where, updateDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { checkPriceAlerts } from '@/ai/flows/check-price-alerts';

export default function NotificationsPage() {
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { firebaseUser, user } = useAuth();
  const { toast } = useToast();
  const isHindi = user?.language === 'hi';

  const handleCheckAlerts = useCallback(async () => {
    if (!firebaseUser || !user || !user.name || !firebaseUser.phoneNumber) return;
    try {
      const alertsQuery = query(
        collection(db, 'marketAlerts'),
        where('userId', '==', firebaseUser.uid),
        where('status', '==', 'active')
      );
      const querySnapshot = await getDocs(alertsQuery);
      const activeAlerts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as MarketAlert);

      if (activeAlerts.length > 0) {
        await checkPriceAlerts({ alerts: activeAlerts, profile: user, phone: firebaseUser.phoneNumber });
      }
    } catch (error) {
      console.error('Error checking price alerts:', error);
      // Don't show a toast here as it's a background check.
    }
  }, [firebaseUser, user]);


  useEffect(() => {
    if (!firebaseUser) {
        setIsLoading(false);
        return;
    };

    // Run the background check for triggered alerts when the page loads
    handleCheckAlerts();

    // Set up a real-time listener for alerts
    const alertsCollectionRef = collection(db, 'marketAlerts');
    const q = query(
      alertsCollectionRef,
      where("userId", "==", firebaseUser.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const alertsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketAlert));
      alertsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAlerts(alertsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching alerts with snapshot:", error);
      toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "आपकी सूचनाएं नहीं मिल सकीं।" : "Could not fetch your alerts.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup the listener on component unmount
  }, [firebaseUser, toast, isHindi, handleCheckAlerts]);

  const handleDelete = async (alertId: string) => {
    if (!window.confirm(isHindi ? 'क्या आप वाकई इस सूचना को हटाना चाहते हैं?' : 'Are you sure you want to delete this alert?')) return;
    try {
      await deleteDoc(doc(db, 'users', firebaseUser!.uid, 'marketAlerts', alertId));
      // UI will update automatically thanks to onSnapshot
      toast({ title: isHindi ? "सफलता" : "Success", description: isHindi ? "सूचना सफलतापूर्वक हटा दी गई।" : "Alert deleted successfully." });
    } catch (error) {
      console.error("Error deleting alert:", error);
      toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "सूचना को हटाया नहीं जा सका।" : "Could not delete the alert.", variant: "destructive" });
    }
  };
  
  const handleMarkAsSeen = async (alertId: string) => {
    try {
        const alertRef = doc(db, 'marketAlerts', alertId);
        await updateDoc(alertRef, { status: 'acknowledged' });
        // UI will update automatically thanks to onSnapshot
        toast({ title: isHindi ? "सफलता" : "Success", description: isHindi ? "सूचना को देखा गया के रूप में चिह्नित किया गया।" : "Alert marked as seen." });
    } catch(error) {
      console.error("Error updating alert:", error);
      toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "सूचना को अपडेट नहीं किया जा सका।" : "Could not update the alert.", variant: "destructive" });
    }
  }

  const getStatusInfo = (alert: MarketAlert) => {
    switch (alert.status) {
      case 'active':
        return { icon: <Bell className="h-5 w-5 text-yellow-500" />, text: `${isHindi ? `₹${alert.priceThreshold} से ऊपर होने पर सक्रिय होगा` : `Set to trigger above ₹${alert.priceThreshold}`}` };
      case 'triggered':
        return { icon: <CircleCheck className="h-5 w-5 text-green-500" />, text: `${isHindi ? `कीमत ₹${alert.triggeredPrice} पर पहुंच गई! लक्ष्य ₹${alert.priceThreshold} था।` : `Price reached ₹${alert.triggeredPrice}! Target was ₹${alert.priceThreshold}.`}` };
       case 'acknowledged':
        return { icon: <Eye className="h-5 w-5 text-blue-500" />, text: isHindi ? 'आपने इस सूचना को स्वीकार कर लिया है।' : 'You acknowledged this alert.' };
      case 'cancelled':
        return { icon: <CircleX className="h-5 w-5 text-muted-foreground" />, text: isHindi ? 'यह सूचना रद्द कर दी गई थी।' : 'This alert was cancelled.' };
      default:
        return { icon: <Bell className="h-5 w-5 text-muted-foreground" />, text: isHindi ? 'अज्ञात स्थिति' : 'Unknown status' };
    }
  }
  
  const getBadgeVariant = (status: MarketAlert['status']) => {
    switch(status) {
        case 'active': return 'default';
        case 'triggered': return 'destructive';
        case 'acknowledged': return 'secondary';
        case 'cancelled': return 'outline';
        default: return 'secondary';
    }
  }


  return (
    <AppLayout title={isHindi ? "सूचनाएं" : "Notifications"}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{isHindi ? "आपकी बाजार सूचनाएं" : "Your Market Alerts"}</CardTitle>
            <CardDescription>{isHindi ? "यहाँ आपके द्वारा निर्धारित और सक्रिय की गई सभी मूल्य सूचनाओं की सूची है।" : "Here is a list of all the price alerts you have set and triggered."}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert) => {
                  const { icon, text } = getStatusInfo(alert);
                  return (
                    <Card key={alert.id} className="flex items-center p-4 justify-between">
                      <div className="flex items-center gap-4">
                        {icon}
                        <div>
                          <p className="font-semibold">
                            {alert.crop}
                          </p>
                           <p className="text-sm text-muted-foreground">{text}</p>
                           <p className="text-xs text-muted-foreground mt-1">
                               {isHindi ? 'सेट' : 'Set'} {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                           </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <Badge variant={getBadgeVariant(alert.status)}>
                            {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                        </Badge>
                        {alert.status === 'triggered' && (
                             <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAsSeen(alert.id)}
                            >
                                <Eye className="mr-2 h-4 w-4" /> {isHindi ? 'देखा गया के रूप में चिह्नित करें' : 'Mark as Seen'}
                            </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(alert.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card text-center h-40">
                <h3 className="text-xl font-semibold">{isHindi ? 'कोई सूचना नहीं मिली' : 'No alerts found'}</h3>
                <p className="text-muted-foreground mt-2">{isHindi ? 'आपने अभी तक कोई मूल्य सूचना निर्धारित नहीं की है।' : "You haven't set any price alerts yet."}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
