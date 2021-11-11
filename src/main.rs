mod relay;

use eyre::{Result};
use clap::{Parser};

/// This is the router for carparty. It is simple and nice. It routes the websockets.
#[derive(Parser)]
#[clap(version = "0.1", author = "CarParty Development Team")]
struct Opts {
    /// The port on which the server will run.
    #[clap(short, long, default_value = "8080")]
    port: u32,
    /// The IP on which the server will run.
    #[clap(short, long, default_value = "127.0.0.1")]
    ip: String,
}
 
#[tokio::main]
async fn main() -> Result<()> {
    let opts: Opts = Opts::parse();
    relay::run_relay(&opts.ip, opts.port).await
}
