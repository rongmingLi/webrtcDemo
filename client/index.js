

var myname;
var connectedUser;

var conn = new WebSocket('ws://127.0.0.1:9090');

conn.onopen = ()=>{
    console.log("Connected to the signaling server");
}
conn.onmessage =(msg)=>{
    console.log("Got message",msg.data);

    var data = JSON.parse(msg.data);
    switch (data.type) {
        case "login":
            handleLogin(data.success);
            break;
        case "offer":
            handleOffer(data.offer,data.name);
            break;
        case "answer":
            handleAnswer(data.answer);
            break;
        case "candidate":
            handleCandidate(data.candidate);
            break;
        case "leave":
            handleLeave();
            break;
    
        default:
            break;
    }
}
conn.onerror = (err)=>{
    console.log("Got error",err)
}
function send(message) {
    if(connectedUser){
        message.name = connectedUser
    }
    conn.send(JSON.stringify(message))
}
//*****
//UI selectors block
//*/
var loginPage = document.querySelector('#loginPage')
var usernameInput = document.querySelector('#usernameInput')
var loginBtn = document.querySelector('#loginBtn')

var callPage = document.querySelector('#callPage')
var callToUsernameInput = document.querySelector('#callToUsernameInput')
var callBtn = document.querySelector('#callBtn')

var hangUpBtn = document.querySelector('#hangUpBtn');

var localVideo = document.querySelector('#localVideo')
var remoteVideo = document.querySelector('#remoteVideo')

var yourConn;
var stream;

var remoteStream = new MediaStream();

remoteVideo.addEventListener('loadedmetadata',()=>{
    console.log('remoteVideo ====================loadedmetadata')
})
callPage.style.display = "none";

//Login when the user clicks the button
loginBtn.addEventListener("click",(event)=>{
    console.log("-------> usernameInput")
    myname = usernameInput.value;

    if(myname.length >0 ){
        send({
            type: "login",
            name: myname
        })
    }
})

    

function handleLogin(success) {
    if(success === false){
        alert("Ooops...try a different username");
    }else{
        loginPage.style.display = "none";
        callPage.style.display = "block";
        //**************** */
        //Starting a peer connection
        //*************** */
        var configuration = {
            "iceServers":[{"url":"stun:stun2.1.google.com:19302"}]
        }
        yourConn = new RTCPeerConnection(configuration);
        
        yourConn.ontrack = async (e)=>{
            console.log('ontrack---------99--->',e)
            
            remoteVideo.srcObject = e.streams[0];
            
        }
        //setup stream listening
        

        
        //setup ice handling
        yourConn.onicecandidate = (event)=>{
            if(event.candidate){
                send({
                    type:"candidate",
                    candidate:event.candidate
                });
            }
        }
        //getting local video stream
        navigator.mediaDevices.getUserMedia({video:true,audio:false}).then((myStream)=>{
            stream = myStream;
            for (const track of stream.getTracks()) {
                yourConn.addTrack(track,stream)
            }
            localVideo.srcObject =stream
            localVideo.addEventListener('loadedmetadata',()=>{
                console.log('localVideo loadedmetadata')
                localVideo.play()
            })
            // yourConn.addStream(stream);
           
        }).catch((e)=>{
            console.warn('getdevices error',e)
        })
        
    }
};
callBtn.addEventListener('click',()=>{
    var callToUsername = callToUsernameInput.value;
    if(callToUsername.length >0 ){
        connectedUser = callToUsername;
    }
    yourConn.sendC = yourConn.createDataChannel("sendChannel")
    yourConn.sendC.onmessage=e=>{
        console.log("message received "+ e.data)
    }
    yourConn.sendC.onopen= e =>{
        console.log("message open")
    }
    yourConn.sendC.onclose = e=>{
        console.log("message close!!!!!!")
    }
    yourConn.createOffer((offer)=>{
        yourConn.setLocalDescription(offer)
        console.log("createOffer---->",offer)
        
        send({
            type:"offer",
            offer:offer
        })
        
     },(e)=>{
         console.warn(e)
         alert("Error when creating an offer")
     })
})
 function handleOffer(offer,name) {
    connectedUser = name;
    console.log('handleOffer------------->',offer)
    yourConn.ondatachannel=e=>{
        const sendC = e.channel
        sendC.onmessage = e=>{console.log(e.data)}
        sendC.onopen=e=>{console.log("open------>")}
        sendC.onclose=e=>{console.log("close-------->")}
        yourConn.sendC=sendC
    }
    yourConn.setRemoteDescription(new RTCSessionDescription(offer));
    //create an answer to an offer

    yourConn.createAnswer(async (answer)=>{
       
        console.log('createAnswer',answer)
        await yourConn.setLocalDescription(answer)
        console.log('----remoteVideo-------------',remoteVideo)
    console.log('----localVideo-------------',localVideo)
        send({
            type:"answer",
            answer:answer
        })
    },(e)=>{
        console.warn(e)
        alert("Error when creating an answer")
    })
}
async function handleAnswer(answer) {
    console.log('handleAnswer answer------->',answer)

    await yourConn.setRemoteDescription(new RTCSessionDescription(answer))
    console.log('----remoteVideo-------------',remoteVideo)
    console.log('----localVideo-------------',localVideo)

    
}
function handleCandidate(candidate) {
    console.log('----handleCandidate-------------',localVideo)
    yourConn.addIceCandidate(candidate)
}
//hang up 
hangUpBtn.addEventListener("click",()=>{
    send({
        type:"leave"
    });
    handleLeave();
});
function handleLeave() {
    connectedUser=null;
    remoteVideo.srcObject=null;

    yourConn.close();
    yourConn.onicecandidate = null;
    yourConn.onaddstream = null;
}