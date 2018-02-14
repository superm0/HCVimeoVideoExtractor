//
//  ViewController.swift
//  HCVimeoVideoExtractor
//
//  Created by Mo Cariaga on 02/14/2018.
//  Copyright (c) 2018 Mo Cariaga. All rights reserved.
//

import UIKit
import HCVimeoVideoExtractor

class ViewController: UIViewController {

    @IBOutlet weak var txtVimeoURL: UITextField!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }

    @IBAction func getVideoURL(_ sender: Any) {
        
        if let url = URL(string: self.txtVimeoURL.text!) {
            
            HCVimeoVideoExtractor.fetchVideoURLFrom(url: url) { ( videos:[HCVimeoVideo]?, error:Error?) -> Void in
                
                
            }
        }
    }
    
}

