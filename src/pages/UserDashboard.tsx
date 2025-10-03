import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, AttendanceRecord } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Camera, Clock, LogOut, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function UserDashboard() {
  const { user, signOut } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  const fetchRecords = async () => {
    const { data } = await (supabase as any)
      .from('attendance_records')
      .select('*')
      .eq('user_id', user?.id)
      .order('check_in_time', { ascending: false })
      .limit(10);
    
    if (data) setRecords(data);
  };

  const startCamera = async () => {
    try {
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false 
      });
      
      console.log('Camera access granted, stream:', stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          console.log('Video playing, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
        };
        
        setIsCameraActive(true);
        console.log('Camera active, video element configured');
        
        toast({
          title: 'Camera Ready',
          description: 'Position yourself and click capture when ready.',
        });
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      toast({
        title: 'Camera Error',
        description: error.name === 'NotAllowedError' 
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Unable to access camera. Please check your device has a camera.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    console.log('Capturing photo...');
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context && videoRef.current.videoWidth > 0) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        console.log('Photo captured successfully');
        setCapturedImage(imageData);
        stopCamera();
        
        toast({
          title: 'Photo Captured',
          description: 'Add notes and submit your check-in.',
        });
      } else {
        console.error('Video not ready or invalid dimensions');
        toast({
          title: 'Capture Failed',
          description: 'Camera is not ready yet. Please wait a moment.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleCheckIn = async () => {
    if (!capturedImage) {
      toast({
        title: 'Photo Required',
        description: 'Please capture a photo before checking in.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    console.log('Starting check-in submission...');
    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      console.log('Image converted to blob:', blob.size, 'bytes');
      
      // Upload to storage
      const fileName = `${user?.id}/${Date.now()}.jpg`;
      console.log('Uploading to storage:', fileName);
      const { error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, blob);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      console.log('Upload successful');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(fileName);
      console.log('Public URL:', publicUrl);

      // Create attendance record
      console.log('Creating attendance record...');
      const { error: insertError } = await supabase
        .from('attendance_records' as any)
        .insert({
          user_id: user?.id,
          photo_url: publicUrl,
          notes: notes || null,
          status: 'present',
        } as any);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
      console.log('Attendance record created successfully');

      toast({
        title: 'Check-in Successful!',
        description: 'Your attendance has been recorded.',
      });

      setCapturedImage(null);
      setNotes('');
      fetchRecords();
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">My Attendance</h1>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Check-in Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Check In
              </CardTitle>
              <CardDescription>Capture your photo and submit attendance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!capturedImage ? (
                <div className="space-y-4">
                  {isCameraActive ? (
                    <div className="relative bg-black rounded-lg overflow-hidden min-h-[400px]">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                        <Button
                          onClick={stopCamera}
                          variant="outline"
                          size="lg"
                          className="bg-background/80 backdrop-blur"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={capturePhoto}
                          size="lg"
                        >
                          <Camera className="w-5 h-5 mr-2" />
                          Capture Photo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-12 text-center">
                      <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <Button onClick={startCamera}>
                        <Camera className="w-4 h-4 mr-2" />
                        Start Camera
                      </Button>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden">
                    <img src={capturedImage} alt="Captured" className="w-full" />
                    <Button
                      onClick={() => setCapturedImage(null)}
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                    >
                      Retake
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes (Optional)</label>
                    <Textarea
                      placeholder="Add any notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleCheckIn} 
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {loading ? 'Submitting...' : 'Submit Check-in'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance History */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>Your attendance history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {records.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No check-ins yet</p>
                ) : (
                  records.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {format(new Date(record.check_in_time), 'PPp')}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          record.status === 'present' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {record.status}
                        </span>
                      </div>
                      {record.photo_url && (
                        <img 
                          src={record.photo_url} 
                          alt="Check-in"
                          className="w-full h-32 object-cover rounded"
                        />
                      )}
                      {record.notes && (
                        <p className="text-sm text-muted-foreground">{record.notes}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
