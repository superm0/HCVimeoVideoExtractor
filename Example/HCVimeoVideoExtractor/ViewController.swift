//
//  ViewController.swift
//  HCVimeoVideoExtractor
//
//  Created by Mo Cariaga on 02/14/2018.
//  Copyright (c) 2018 Mo Cariaga. All rights reserved.
//

import UIKit
import AVKit
import AVFoundation
import HCVimeoVideoExtractor


class ViewController: UIViewController {

    @IBOutlet weak var txtVimeoURL: UITextField!
    @IBOutlet weak var lblTitle: UILabel!
    @IBOutlet weak var imageView: UIImageView!
    
    var videoURL: URL?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        self.txtVimeoURL.text = "https://vimeo.com/254597739"
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }

    @IBAction func getVideoURL(_ sender: Any) {
        
        if let url = URL(string: self.txtVimeoURL.text!) {
            HCVimeoVideoExtractor.fetchVideoURLFrom(id: "761683080", completion: { ( video:HCVimeoVideo?, error:Error?) -> Void in
//            HCVimeoVideoExtractor.fetchVideoURLFrom(url: url, completion: { ( video:HCVimeoVideo?, error:Error?) -> Void in
            
                if let err = error {
                    
                    print("Error = \(err.localizedDescription)")
                    
                    DispatchQueue.main.async() {
                        self.lblTitle.text = "-"
                        self.imageView.image = nil
                        self.videoURL = nil
                        
                        let alert = UIAlertController(title: "Error", message: err.localizedDescription, preferredStyle: .alert)
                        alert.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))
                        self.present(alert, animated: true, completion: nil)
                    }
                    return
                }
                
                guard let vid = video else {
                    print("Invalid video object")
                    return
                }
                
                print("Title = \(vid.title), url = \(vid.videoURL), thumbnail = \(vid.thumbnailURL)")
            
                
                /*
                    let player = AVPlayer(url: vid.videoURL[.Quality540p]!)
                    let playerController = AVPlayerViewController()
                    playerController.player = player
                    self.present(playerController, animated: true) {
                        player.play()
                */
                        
                DispatchQueue.main.async() {
                    self.videoURL = vid.videoURL[.quality540p]
                    self.lblTitle.text = vid.title
                    
                    if let url = vid.thumbnailURL[.qualityBase] {
                        self.imageView.contentMode = .scaleAspectFit
                        self.downloadImage(url: url)
                    }
                }
            })
        }
        
        /*
         HCVimeoVideoExtractor.fetchVideoURLFrom(id: "254597739", completion: { ( video:HCVimeoVideo?, error:Error?) -> Void in
         if let err = error {
         print("Error = \(err.localizedDescription)")
         return
         }
         
         guard let vid = video else {
         print("Invalid video object")
         return
         }
         
         print("Title = \(vid.title), url = \(vid.videoURL), thumbnail = \(vid.thumbnailURL)")
         
         if let videoURL = vid.videoURL[.Quality540p] {
         let player = AVPlayer(url: videoURL)
         let playerController = AVPlayerViewController()
         playerController.player = player
         self.present(playerController, animated: true) {
         player.play()
         }
         }
         })
         */
    }
    
    @IBAction func play(_ sender: Any) {
        
        if let url = self.videoURL {
            let player = AVPlayer(url: url)
            let playerController = AVPlayerViewController()
            playerController.player = player
            self.present(playerController, animated: true) {
                player.play()
            }
        }
        else {
            let alert = UIAlertController(title: "Error", message: "Invalid video URL", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))
            self.present(alert, animated: true, completion: nil)
        }
    }
    
    func downloadImage(url: URL) {
        getDataFromUrl(url: url) { data, response, error in
            guard let data = data, error == nil else { return }
            DispatchQueue.main.async() {
                self.imageView.image = UIImage(data: data)
            }
        }
    }
    
    func getDataFromUrl(url: URL, completion: @escaping (Data?, URLResponse?, Error?) -> ()) {
        URLSession.shared.dataTask(with: url) { data, response, error in
            completion(data, response, error)
            }.resume()
    }
}

