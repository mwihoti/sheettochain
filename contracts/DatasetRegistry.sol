// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DatasetRegistry
 * @notice Smart contract for registering and validating CSV datasets on Hedera
 * @dev Implements on-chain registry, validation, and access control
 */
contract DatasetRegistry {
    
    // ============ State Variables ============
    
    struct Dataset {
        bytes32 hash;              // SHA-256 hash of CSV data
        address uploader;          // Account that registered dataset
        uint256 timestamp;         // Registration timestamp
        uint256 rowCount;          // Number of rows in dataset
        uint256 columnCount;       // Number of columns
        uint256 tokenId;           // Associated HTS NFT token ID
        bool verified;             // Validation status
        string fileName;           // Original file name (max 50 chars)
    }
    
    struct ValidationRules {
        uint256 minRows;
        uint256 maxRows;
        uint256 maxColumns;
        uint256 minHashLength;
    }
    
    // Datasets mapping: hash => Dataset
    mapping(bytes32 => Dataset) public datasets;
    
    // User's datasets: uploader => hash[]
    mapping(address => bytes32[]) public uploaderDatasets;
    
    // Hash existence check (gas efficient)
    mapping(bytes32 => bool) public hashExists;
    
    // Validation rules
    ValidationRules public rules;
    
    // Contract owner
    address public owner;
    
    // Statistics
    uint256 public totalDatasets;
    uint256 public totalUploaders;
    
    // ============ Events ============
    
    event DatasetRegistered(
        bytes32 indexed hash,
        address indexed uploader,
        uint256 rowCount,
        uint256 columnCount,
        uint256 timestamp
    );
    
    event DatasetVerified(
        bytes32 indexed hash,
        bool verified
    );
    
    event TokenLinked(
        bytes32 indexed hash,
        uint256 tokenId
    );
    
    event ValidationRulesUpdated(
        uint256 minRows,
        uint256 maxRows,
        uint256 maxColumns
    );
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier validHash(bytes32 _hash) {
        require(_hash != bytes32(0), "Invalid hash: zero bytes");
        require(!hashExists[_hash], "Dataset already registered");
        _;
    }
    
    modifier requireDatasetExists(bytes32 _hash) {
        require(hashExists[_hash], "Dataset not found");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
        
        // Set default validation rules
        rules = ValidationRules({
            minRows: 1,
            maxRows: 100000,      // Up to 100k rows
            maxColumns: 100,      // Up to 100 columns
            minHashLength: 32     // SHA-256 = 32 bytes
        });
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Register a new dataset
     * @param _hash SHA-256 hash of CSV data
     * @param _rowCount Number of rows in dataset
     * @param _columnCount Number of columns in dataset
     * @param _fileName Original file name (max 50 chars)
     * @return success Whether registration succeeded
     */
    function registerDataset(
        bytes32 _hash,
        uint256 _rowCount,
        uint256 _columnCount,
        string memory _fileName
    ) external validHash(_hash) returns (bool success) {
        // Validate row count
        require(
            _rowCount >= rules.minRows && _rowCount <= rules.maxRows,
            "Row count out of bounds"
        );
        
        // Validate column count
        require(
            _columnCount > 0 && _columnCount <= rules.maxColumns,
            "Column count out of bounds"
        );
        
        // Validate file name length
        require(
            bytes(_fileName).length > 0 && bytes(_fileName).length <= 50,
            "Invalid file name length"
        );
        
        // Create dataset record
        datasets[_hash] = Dataset({
            hash: _hash,
            uploader: msg.sender,
            timestamp: block.timestamp,
            rowCount: _rowCount,
            columnCount: _columnCount,
            tokenId: 0,           // Set later when NFT minted
            verified: true,       // Auto-verified if passes validation
            fileName: _fileName
        });
        
        // Track uploader's datasets
        if (uploaderDatasets[msg.sender].length == 0) {
            totalUploaders++;
        }
        uploaderDatasets[msg.sender].push(_hash);
        
        // Mark hash as existing
        hashExists[_hash] = true;
        totalDatasets++;
        
        emit DatasetRegistered(
            _hash,
            msg.sender,
            _rowCount,
            _columnCount,
            block.timestamp
        );
        
        return true;
    }
    
    /**
     * @notice Link HTS token ID to registered dataset
     * @param _hash Dataset hash
     * @param _tokenId HTS token ID
     */
    function linkToken(
        bytes32 _hash,
        uint256 _tokenId
    ) external requireDatasetExists(_hash) {
        require(
            datasets[_hash].uploader == msg.sender,
            "Only uploader can link token"
        );
        require(
            datasets[_hash].tokenId == 0,
            "Token already linked"
        );
        require(_tokenId > 0, "Invalid token ID");
        
        datasets[_hash].tokenId = _tokenId;
        
        emit TokenLinked(_hash, _tokenId);
    }
    
    /**
     * @notice Verify a dataset (admin function)
     * @param _hash Dataset hash
     * @param _verified Verification status
     */
    function verifyDataset(
        bytes32 _hash,
        bool _verified
    ) external onlyOwner requireDatasetExists(_hash) {
        datasets[_hash].verified = _verified;
        
        emit DatasetVerified(_hash, _verified);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Check if dataset is registered and verified
     * @param _hash Dataset hash
     * @return verified Verification status
     */
    function isVerified(bytes32 _hash) external view returns (bool verified) {
        return hashExists[_hash] && datasets[_hash].verified;
    }
    
    /**
     * @notice Get dataset details
     * @param _hash Dataset hash
     * @return dataset Dataset struct
     */
    function getDataset(bytes32 _hash) 
        external 
        view 
        requireDatasetExists(_hash)
        returns (Dataset memory dataset) 
    {
        return datasets[_hash];
    }
    
    /**
     * @notice Get all datasets by uploader
     * @param _uploader Uploader address
     * @return hashes Array of dataset hashes
     */
    function getDatasetsByUploader(address _uploader) 
        external 
        view 
        returns (bytes32[] memory hashes) 
    {
        return uploaderDatasets[_uploader];
    }
    
    /**
     * @notice Get dataset count for uploader
     * @param _uploader Uploader address
     * @return count Number of datasets
     */
    function getUploaderDatasetCount(address _uploader) 
        external 
        view 
        returns (uint256 count) 
    {
        return uploaderDatasets[_uploader].length;
    }
    
    /**
     * @notice Check if hash exists (gas efficient)
     * @param _hash Dataset hash
     * @return exists Whether dataset exists
     */
    function datasetExists(bytes32 _hash) external view returns (bool exists) {
        return hashExists[_hash];
    }
    
    /**
     * @notice Get contract statistics
     * @return _totalDatasets Total datasets registered
     * @return _totalUploaders Total unique uploaders
     */
    function getStats() external view returns (
        uint256 _totalDatasets,
        uint256 _totalUploaders
    ) {
        return (totalDatasets, totalUploaders);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update validation rules
     * @param _minRows Minimum rows allowed
     * @param _maxRows Maximum rows allowed
     * @param _maxColumns Maximum columns allowed
     */
    function updateValidationRules(
        uint256 _minRows,
        uint256 _maxRows,
        uint256 _maxColumns
    ) external onlyOwner {
        require(_minRows < _maxRows, "Min must be less than max");
        require(_maxRows > 0, "Max rows must be positive");
        require(_maxColumns > 0, "Max columns must be positive");
        
        rules.minRows = _minRows;
        rules.maxRows = _maxRows;
        rules.maxColumns = _maxColumns;
        
        emit ValidationRulesUpdated(_minRows, _maxRows, _maxColumns);
    }
    
    /**
     * @notice Transfer ownership
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }
}
