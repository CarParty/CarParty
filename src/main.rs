mod relay;

use clap::Parser;
use eyre::Result;

/// This is the router for carparty. It routes the websockets and gives the server information
/// about what is happening.
#[derive(Parser)]
#[clap(version = "0.2", author = "CarParty Development Team")]
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
