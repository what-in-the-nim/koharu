fn main() {
    // GTK and CEF must resolve the same bundled Vulkan loader. Unlike RUNPATH,
    // RPATH also applies to GTK's transitive dependencies.
    if std::env::var("CARGO_CFG_TARGET_OS").is_ok_and(|os| os == "linux") {
        println!("cargo:rustc-link-arg=-Wl,--disable-new-dtags");
    }
    tauri_build::build();
}
