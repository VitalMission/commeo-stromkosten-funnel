(function(w,d,s,u,n,t,e){
  if(w.fbq) return;
  n=w.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!w._fbq) w._fbq=n;
  n.push=n;n.loaded=true;n.version='2.0';n.queue=[];
  t=d.createElement(s);t.async=true;t.src=u;
  e=d.getElementsByTagName(s)[0];e.parentNode.insertBefore(t,e);
})(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

fbq('init','2030837650409459');
fbq('track','PageView');

