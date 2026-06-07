import com.sun.net.httpserver.{HttpServer, HttpExchange, HttpHandler}
import java.net.InetSocketAddress

object Biometria {
  def main(args: Array[String]): Unit = {
    // Levantamos el microservicio en el puerto 9000
    val server = HttpServer.create(new InetSocketAddress(9000), 0)
    
    server.createContext("/sensor", new HttpHandler {
      override def handle(t: HttpExchange): Unit = {
        // Simulamos un ritmo cardíaco que varía dinámicamente
        val bpm = 70 + (Math.random() * 40).toInt 
        val response = s"""{"bpm": $bpm, "estado": "Activo"}"""
        
        t.getResponseHeaders.add("Content-Type", "application/json")
        t.sendResponseHeaders(200, response.length)
        
        val os = t.getResponseBody
        os.write(response.getBytes)
        os.close()
      }
    })
    
    server.start()
    println("🚀 Microservicio Biométrico Scala corriendo en http://localhost:9000/sensor")
  }
}