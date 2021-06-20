var ws= require('ws').Server

var wss=new ws({port:9090});

var users ={};

wss.on('connection',(connection)=>{
    console.log("User connected");

    connection.on('message',(message)=>{
        var data;
        
        try {
            data=JSON.parse(message);
            console.log('on message--->',data.type)
        } catch (error) {
            console.warn("Invaild JSON")
            data={}
        }
    
    switch (data.type) {
        case 'login':
            console.log("User logged",data.name);

            if(users[data.name]){
                sendTo(connection,{
                    type:"login",
                    success:false
                });
            }else{
                users[data.name] = connection;
                connection.name = data.name;

                sendTo(connection,{
                    type:"login",
                    success:true
                })
            }
            
            break;
            case "offer":
                console.log("Sending offer to: ",data.name);

                var conn = users[data.name];
                if(conn !=null){
                    connection.otherName = data.name;
                    sendTo(conn,{
                        type: "offer",
                        offer: data.offer,
                        name: connection.name
                    })
                }
                break;
            case "answer":
                console.log("Sending answer to: ",data.name)
                var conn = users[data.name];

                if(conn!=null){
                    connection.otherName = data.name;
                    sendTo(conn,{
                        type:"answer",
                        answer:data.answer
                    });
                }
                break;
            case "candidate":
                console.log("Sending candidata to:",data.name)
                var conn =users[data.name];
                if(conn !=null){
                    sendTo(conn,{
                        type: "candidate",
                        candidate:data.candidate
                    })
                }
                break;
            case "leave":
                console.log("Disconnecting from ",data.name);
                var conn = users[data.name];
                conn&&(conn.otherName=null);

                if(conn != null){
                    sendTo(conn,{type:"leave"})
                }
                break;
    
        default:
            sendTo(connection,{
                type:"error",
                message: "Command not found: "+data.type
            })
            break;
    }
})
})
function sendTo(connection,message) {
    connection.send(JSON.stringify(message))
}
