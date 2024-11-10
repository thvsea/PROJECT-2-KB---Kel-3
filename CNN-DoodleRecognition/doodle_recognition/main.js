//event handler untuk event onload dari window, dijalankan ketika semua halaman web dan resource telah dimuat
window.onload = function () { 
	//membuat object game baru yang merupakan instance dari phasergame, 1280 lebar canvas game px, 720 tinggi dalam px, 
	//phasercanvas tipe renderer yg digunakan (dalam hal ini canvashtml5)
	var game = new Phaser.Game(1280, 720, Phaser.CANVAS); //game itu wadah utama di mana seluruh permainan berjalan
	
	//menambah sebuah state ke object game
	game.state.add('MainState', App.MainState); //state itu cara Phaser mengatur logika permainan dan interaksi antara elemen permainan
	
	//memulai main state
	game.state.start('MainState');
};

//Variabel App untuk simpan dataset. objek  yang digunakan untuk menyimpan berbagai properti, fungsi, atau kelas
var App = App || {}; //jika app sudah ada, gunakan yang sudah ada. jika tidak, buat objek kosong baru

//array konstanta yang berisi nama nama dataset yang akan digunakan
App.DATASETS = ['tree', 'umbrella', 'candle', 'clock', 'fish', 'car', 'octopus', 'snowman']; 

//konstanta yang menunjukkan jumlah sampel data uji yang akan diprediksi oleh cnn
App.NUM_SAMPLES = 16;

App.MainState = function(){ //fungsi yang akan dipanggil saat instance baru dari main state dibuat
	//status state
	this.MODE_INIT = 1; //mode untuk inisialisasi game
	this.MODE_OPEN_FILE = 2; //mode untuk memuat file dataset
	this.MODE_LOAD_FILE = 3; //mode untuk nunggu dataset sls dimuat
	this.MODE_START_TRAIN = 4; //mulai train cnn
	this.MODE_DO_TRAIN = 5; //nunggu pelatihan cnn selesai
	this.MODE_START_PREDICT = 6; //mulai prediksi menggunakan cnn
	this.MODE_DO_PREDICT = 7; //nunggu prediksi selesai
	this.MODE_DRAW = 8; //memungkinkan user menggambar dan mengenali doodle menggunakan cnn
	this.MODE_CLICK_ON_TRAIN = 9; //nangani tombol train
	this.MODE_CLICK_ON_TEST = 10; //tombol more
	this.MODE_CLICK_ON_CLEAR = 11; //tombol clear
	
	//mengatur mode awal dari mode mainstate ke mode init
	this.mode = this.MODE_INIT;
	
	//counter untuk dataset yang saat ini dimuat
	this.dataset = 0;
};

//* //

//mendefinisikan prototype untuk app.mainstate
//semua metode yg didefinisikan dalam objek ini akan tersedia untuk semua instance dari main state
App.MainState.prototype = {
	preload : function(){ //secara otomatis dipanggil oleh phaser hanya sekali untuk memuat semua aset sebelum game dimulai (gambar, font, audio)
		this.game.load.image('imgBack', '../assets/IMG_BG.png'); //gambar untuk background
		this.game.load.image('imgDisable', '../assets/disable_img.png'); //gambar yang digunakan untuk disable draw pad 
		
		this.game.load.image('btnTrain', '../assets/btn_trainmore.png'); //button train
		this.game.load.image('btnTest', '../assets/btn_more.png'); //button more
		this.game.load.image('btnClear', '../assets/btn_clear.png'); //button clear
		
		this.load.bitmapFont('fntBlackChars', '../assets/fnt_black.png', '../assets/fnt_black.fnt'); //menampilkan text dalam game
	},
	
	create : function(){ //method create untuk main state, dipanggil setelah method preload selesai memuat semua aset yang diperlukan
		//mengatur elemen-elemen awal game, seperti skala layar, background, dan berbagai objek game. 
		//mengatur mode skala sehingga game akan diubah ukurannya untuk memenuhi seluruh layar
		this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		this.scale.pageAlignVertically = true; //mengatur secara vertikal agar game disejajarkan di tengah halaman
		this.scale.pageAlignHorizontally = true; //mengatur secara horizontal agar game disejajarkan di tengah halaman
		
		//mengatur agar game tetap berjalan meskipun kehilangan fokus (misal pengguna klik tab lain di browser)
		this.game.stage.disableVisibilityChange = true;

		//menambahkan gambar background pada game pada posisi 0,0. gambar yang dipake adalah imgback yang telah dimuat di method preload
		this.game.add.sprite(0, 0, 'imgBack');
		
		//membuat loader baru untuk memuat dataset ke game, this loader iku instance baru dari phaser loader
		this.loader = new Phaser.Loader(this.game);
		
		//membuat instance baru dari ui untuk mengatur user interface, spt tombol bitmap teks dalam game. instance ui disimpan dalam properti this.ui
		this.ui = new UI(this);
		
		//membuat instance baru dari cnn
		this.cnn = new CNN(this);
		
		//membuat instance baru dari painter
		this.painter = new Painter(this);
	},
	
	update : function(){ //secara otomatis dipanggil pada setiap frame dalam game
		//tempat dimana logika game utama dijalankan dan diperbarui terus menerus
		switch(this.mode){ //menentukan tindakan berdasarkan this mode
			case this.MODE_INIT: //mode_init itu digunakan untuk inisialisasi game
				this.painter.reset(); //reset painter
				this.painter.disable(); //nonaktifkan painter
				this.ui.disableButtons(); //menonaktifkan tombol ui
				
				this.mode = this.MODE_OPEN_FILE; //mengubah mode ke mode_open_file, memulai proses pemuatan dataset
				break;
				
			case this.MODE_OPEN_FILE: //memuat file dataset
				var fileName = App.DATASETS[this.dataset] + '.bin'; //menentukan nama file dataset saat ini
				
				this.loader.reset(); //reset loader
				this.loader.binary('input_file', '../dataset/'+fileName); //memuat file biner dataset
				this.loader.start(); //start loader
				
				this.ui.showStatusBar("Loading " + fileName + " file "); //menampilkan status pemuatan

				this.mode = this.MODE_LOAD_FILE; //mengubah ke mode_load_file, untuk menunggu sampai file sls dimuat
				break;
				
			case this.MODE_LOAD_FILE: //menunggu sampe file dataset sls dimuat
				if (this.loader.hasLoaded){ //memeriksa apakah file telah dimuat
					this.cnn.splitDataset( //bagi dataset yang dimuat jadi data pelatihan dan pengujian
						new Uint8Array(this.game.cache.getBinary('input_file')),
						this.dataset
					);
					
					//meningkatkan jumlah dataset yang dimuat
					this.dataset++;
					
					if (this.dataset < App.DATASETS.length){ //klo masih ada dataset yang perlu dimuat, balik ke mode open file, lek ga ubah ke mode start train
						this.mode = this.MODE_OPEN_FILE;
						
					} else {
						this.ui.showStatusBar("Inisialisasi awal training");
						this.mode = this.MODE_START_TRAIN;
					}
				}
				break;

			//mulai proses pelatihan cnn
			case this.MODE_START_TRAIN:
				this.painter.disable(); //disable painter
				this.ui.disableButtons(); //nonaktif button ui
					
				this.cnn.train(); //mulai pelatihan cnn
				
				this.mode = this.MODE_DO_TRAIN; //ubah ke mode do train untuk menunggu pelatihan selesai		
				break;
				
			//mode do train nunggu train cnn slesai
			case this.MODE_DO_TRAIN:
				if (this.cnn.isTrainCompleted){ //meriksa apakah pelatihan selesai
					this.ui.showStatusBar("Training selesai. Memprediksi sample..."); //nampilin pesan pelatihan selesai
					
					this.mode = this.MODE_START_PREDICT; //ubah ke mode start predict untuk memulai prediksi
				}
				break;

			//memulai proses prediksi dengan cnn
			case this.MODE_START_PREDICT:
				this.ui.drawSampleImages(); //menggambar gambar sample
				this.cnn.predictSamples(); //memulai prediksi sample dengan cnn
				
				this.mode = this.MODE_DO_PREDICT; //mengubah ke mode do predict untuk nunggu prediksi selesai
				break;
				
			//untuk nunggu prediksi selesai
			case this.MODE_DO_PREDICT:
				if (this.cnn.isSamplesPredicted){ //memeriksa apakah semua sample telah diprediksi
					this.painter.enable(); //aktifin painter
					this.ui.enableButtons(); //aktifin tombol ui
					
					this.ui.showStatusBar( //menampilkan pesan untuk menggambar objek
						"Gambar objek berikut  :  " + App.DATASETS.join(", ") + 
						" "
					);
					
					this.mode = this.MODE_DRAW; //mengubah ke mode_draw, memulai proses gambar
				}
				break;
				
			//untuk memungkinkan user untuk menggambar dan mengenali doodle menggunakan cnn
			case this.MODE_DRAW:
				if (this.game.input.mousePointer.isDown){ //memeriksa apakah tombol mouse ditekan
					this.painter.draw(this.game.input.x, this.game.input.y); //menggambar pada posisi kursor mouse
					
				} else {
					this.painter.recognize(); //jika tidak ditekan, mulai proses recognize, mengenali doodle yang digambar
				}

				break;
				
			//menangani aksi klik pada tombol train more
			case this.MODE_CLICK_ON_TRAIN:
				this.mode = this.MODE_START_TRAIN;
				break;
			
			//menangani aksi klik pada tombol more
			case this.MODE_CLICK_ON_TEST:
				this.mode = this.MODE_START_PREDICT;
				break;
				
			//menangani aksi klik pada tombol clear
			case this.MODE_CLICK_ON_CLEAR:
				this.painter.reset(); //painter reset
				this.ui.txtDoodlePrediction.setText(""); //mengosongkan teks prediksi doodle
				
				this.mode = this.MODE_DRAW; //mengubah ke mode draw untuk mulai proses draw
				break;
		}
	}
};
